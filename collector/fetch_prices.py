import logging
import os
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
import yfinance as yf
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# ── 로그 설정 ────────────────────────────────────────────────────────────────

LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

_today = datetime.now().strftime("%Y-%m-%d")
_log_file = LOG_DIR / f"{_today}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(_log_file, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ── DB 연결 ──────────────────────────────────────────────────────────────────

load_dotenv()

DB_HOST     = os.getenv("DB_HOST")
DB_PORT     = os.getenv("DB_PORT")
DB_USER     = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME     = os.getenv("DB_NAME")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL, future=True)


# ── DB에서 securities 목록 읽기 ──────────────────────────────────────────────

def get_securities():
    query = text("SELECT id, ticker, name FROM securities ORDER BY id ASC")
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


# ── Yahoo Finance에서 가격 가져오기 ──────────────────────────────────────────

def fetch_history(ticker: str, period: str = "1y") -> pd.DataFrame:
    df = yf.Ticker(ticker).history(period=period, auto_adjust=False)
    if df.empty:
        return df

    df = df.reset_index()
    df["tradeDate"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")
    df["close"]     = df["Close"].astype(float).round(4)
    df["volume"]    = df["Volume"].fillna(0).astype(int)

    return df[["tradeDate", "close", "volume"]]


# ── price_daily upsert ───────────────────────────────────────────────────────

def upsert_price_daily(security_id: int, rows: list[dict]):
    if not rows:
        return

    upsert_sql = text("""
        INSERT INTO price_daily (securityId, tradeDate, close, volume)
        VALUES (:securityId, :tradeDate, :close, :volume)
        ON DUPLICATE KEY UPDATE
            close  = VALUES(close),
            volume = VALUES(volume)
    """)

    payload = [
        {
            "securityId": security_id,
            "tradeDate":  row["tradeDate"],
            "close":      row["close"],
            "volume":     row["volume"],
        }
        for row in rows
    ]

    with engine.begin() as conn:
        conn.execute(upsert_sql, payload)


# ── Benchmark 등록 + 가격 upsert ─────────────────────────────────────────────

def ensure_benchmark(code: str, name: str) -> int:
    select_sql = text("SELECT id FROM benchmarks WHERE code = :code")
    insert_sql = text("INSERT INTO benchmarks (code, name) VALUES (:code, :name)")

    with engine.begin() as conn:
        existing = conn.execute(select_sql, {"code": code}).fetchone()
        if existing:
            return existing[0]
        conn.execute(insert_sql, {"code": code, "name": name})
        return conn.execute(select_sql, {"code": code}).fetchone()[0]


def upsert_benchmark_price(benchmark_id: int, rows: list[dict]):
    if not rows:
        return

    upsert_sql = text("""
        INSERT INTO benchmark_price_daily (benchmarkId, tradeDate, close)
        VALUES (:benchmarkId, :tradeDate, :close)
        ON DUPLICATE KEY UPDATE
            close = VALUES(close)
    """)

    payload = [
        {"benchmarkId": benchmark_id, "tradeDate": row["tradeDate"], "close": row["close"]}
        for row in rows
    ]

    with engine.begin() as conn:
        conn.execute(upsert_sql, payload)


def fetch_and_store_benchmark() -> int:
    """SP500 벤치마크 데이터 수집·저장. 저장된 row 수를 반환."""
    try:
        benchmark_id = ensure_benchmark("SP500", "S&P 500")

        df = yf.Ticker("^GSPC").history(period="1y", auto_adjust=False)
        if df.empty:
            log.warning("[SKIP] SP500 — 데이터 없음")
            return 0

        df = df.reset_index()
        df["tradeDate"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")
        df["close"]     = df["Close"].astype(float).round(4)

        rows = df[["tradeDate", "close"]].to_dict(orient="records")
        upsert_benchmark_price(benchmark_id, rows)
        log.info(f"[OK]   SP500 벤치마크 — {len(rows)}건 저장")
        return len(rows)

    except Exception as e:
        log.error(f"[ERROR] SP500 벤치마크: {e}")
        return 0


# ── 메인 ─────────────────────────────────────────────────────────────────────

def main():
    start = datetime.now()
    log.info("─" * 54)
    log.info("수집 시작")

    securities = get_securities()
    log.info(f"대상 종목: {len(securities)}개")

    success_count = 0
    skip_count    = 0
    total_rows    = 0
    failed_tickers: list[str] = []

    for s in securities:
        ticker = s["ticker"]
        try:
            df = fetch_history(ticker, period="1y")
            if df.empty:
                log.info(f"[SKIP] {ticker:<8} — 데이터 없음")
                skip_count += 1
                continue

            rows = df.to_dict(orient="records")
            upsert_price_daily(s["id"], rows)
            log.info(f"[OK]   {ticker:<8} — {len(rows)}건 저장")
            success_count += 1
            total_rows += len(rows)

        except Exception as e:
            log.error(f"[ERROR] {ticker}: {e}")
            failed_tickers.append(ticker)

    bench_rows  = fetch_and_store_benchmark()
    total_rows += bench_rows

    elapsed = (datetime.now() - start).total_seconds()
    log.info(
        f"수집 완료 — 소요: {elapsed:.1f}초 | "
        f"성공: {success_count} | 실패: {len(failed_tickers)} | "
        f"SKIP: {skip_count} | 총 저장: {total_rows}건"
    )

    if failed_tickers:
        log.warning(f"실패 종목: {', '.join(failed_tickers)}")

    log.info("─" * 54)

    if failed_tickers:
        sys.exit(1)


if __name__ == "__main__":
    main()
