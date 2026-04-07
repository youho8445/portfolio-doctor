"""
S&P 500 종목을 Wikipedia에서 가져와 securities 테이블에 upsert합니다.
실행: python seed_securities.py
"""
import os
import sys
import time
import logging
from pathlib import Path
from datetime import datetime

import io
import requests
import pandas as pd
import yfinance as yf
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# ── 로그 설정 ─────────────────────────────────────────────────────────────────
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
_today = datetime.now().strftime("%Y-%m-%d")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_DIR / f"{_today}-seed.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ── DB 연결 ───────────────────────────────────────────────────────────────────
load_dotenv()
DATABASE_URL = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
engine = create_engine(DATABASE_URL, future=True)

# ── ETF 목록 (S&P 500 외 추가) ────────────────────────────────────────────────
EXTRA_ETFS = [
    ("VOO",  "Vanguard S&P 500 ETF",           "ETF"),
    ("SPY",  "SPDR S&P 500 ETF Trust",         "ETF"),
    ("QQQ",  "Invesco QQQ Trust",              "ETF"),
    ("IWM",  "iShares Russell 2000 ETF",       "ETF"),
    ("VTI",  "Vanguard Total Stock Market ETF","ETF"),
    ("EFA",  "iShares MSCI EAFE ETF",          "ETF"),
    ("EEM",  "iShares MSCI Emerging Markets ETF","ETF"),
    ("GLD",  "SPDR Gold Shares",               "ETF"),
    ("TLT",  "iShares 20+ Year Treasury Bond ETF","ETF"),
    ("AGG",  "iShares Core U.S. Aggregate Bond ETF","ETF"),
    ("SCHD", "Schwab U.S. Dividend Equity ETF","ETF"),
    ("VNQ",  "Vanguard Real Estate ETF",       "ETF"),
    ("ARKK", "ARK Innovation ETF",             "ETF"),
    ("JEPI", "JPMorgan Equity Premium Income ETF","ETF"),
    ("SOXL", "Direxion Daily Semiconductor Bull 3X","ETF"),
]

def get_sp500_tickers() -> list[dict]:
    """Wikipedia에서 S&P 500 목록 다운로드"""
    log.info("Wikipedia에서 S&P 500 목록 다운로드 중...")
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    headers = {"User-Agent": "Mozilla/5.0 (compatible; portfolio-doctor-seeder/1.0)"}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    tables = pd.read_html(io.StringIO(resp.text))
    df = tables[0]
    # 컬럼명이 버전마다 다를 수 있어 유연하게 처리
    ticker_col = [c for c in df.columns if "ticker" in c.lower() or "symbol" in c.lower()][0]
    name_col   = [c for c in df.columns if "security" in c.lower() or "name" in c.lower() or "company" in c.lower()][0]
    sector_col = [c for c in df.columns if "sector" in c.lower()][0]

    rows = []
    for _, row in df.iterrows():
        ticker = str(row[ticker_col]).strip().replace(".", "-")  # BRK.B → BRK-B
        rows.append({
            "ticker": ticker,
            "name": str(row[name_col]).strip(),
            "sector": str(row[sector_col]).strip(),
        })
    log.info(f"  → {len(rows)}개 종목")
    return rows

def fetch_asset_type(ticker: str) -> str:
    """yfinance로 assetType 확인 (ETF 여부)"""
    try:
        info = yf.Ticker(ticker).info
        q_type = info.get("quoteType", "").upper()
        if q_type == "ETF":
            return "ETF"
    except Exception:
        pass
    return "STOCK"

def upsert_security(conn, ticker: str, name: str, sector: str | None,
                    industry: str | None, asset_type: str) -> str:
    """INSERT ... ON DUPLICATE KEY UPDATE"""
    sql = text("""
        INSERT INTO securities (ticker, name, sector, industry, country, assetType)
        VALUES (:ticker, :name, :sector, :industry, 'US', :assetType)
        ON DUPLICATE KEY UPDATE
            name      = VALUES(name),
            sector    = VALUES(sector),
            industry  = VALUES(industry),
            assetType = VALUES(assetType)
    """)
    conn.execute(sql, {
        "ticker": ticker,
        "name": name,
        "sector": sector,
        "industry": industry,
        "assetType": asset_type,
    })
    return ticker

def main():
    start = time.time()

    # 1) S&P 500 목록 가져오기
    sp500 = get_sp500_tickers()

    # 2) ETF 목록 추가
    etf_rows = [{"ticker": t, "name": n, "sector": None, "assetType": "ETF"} for t, n, _ in EXTRA_ETFS]

    success = 0
    failed  = []

    with engine.begin() as conn:
        # ETF 먼저 upsert (yfinance 호출 없이)
        for e in etf_rows:
            try:
                upsert_security(conn, e["ticker"], e["name"], None, None, "ETF")
                log.info(f"  [ETF] {e['ticker']} ✓")
                success += 1
            except Exception as ex:
                log.error(f"  [ETF] {e['ticker']} 실패: {ex}")
                failed.append(e["ticker"])

        # S&P 500 upsert (sector는 Wikipedia 값 사용, yfinance 호출 최소화)
        total = len(sp500)
        for i, row in enumerate(sp500, 1):
            ticker  = row["ticker"]
            name    = row["name"]
            sector  = row["sector"]
            try:
                upsert_security(conn, ticker, name, sector, None, "STOCK")
                log.info(f"  [{i:3}/{total}] {ticker} ✓")
                success += 1
            except Exception as ex:
                log.error(f"  [{i:3}/{total}] {ticker} 실패: {ex}")
                failed.append(ticker)

    elapsed = round(time.time() - start, 1)
    log.info(f"\n완료 — 소요: {elapsed}s | 성공: {success} | 실패: {len(failed)}")
    if failed:
        log.warning(f"실패 목록: {failed}")
        sys.exit(1)

if __name__ == "__main__":
    main()
