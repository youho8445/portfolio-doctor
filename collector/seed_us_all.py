"""
NASDAQ 스크리너 API에서 미국 전체 상장 종목을 가져와 securities 테이블에 upsert합니다.
섹터 정보 포함 (Technology, Healthcare 등)
실행: python seed_us_all.py
"""
import os
import re
import sys
import time
import logging
from pathlib import Path
from datetime import datetime

import requests
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
        logging.FileHandler(LOG_DIR / f"{_today}-seed-us-all.log", encoding="utf-8"),
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
engine = create_engine(DATABASE_URL)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.nasdaq.com",
    "Referer": "https://www.nasdaq.com/",
}

VALID_TICKER = re.compile(r'^[A-Z]{1,5}$')


def fetch_nasdaq_screener() -> list[dict]:
    """NASDAQ 스크리너 API — 전체 미국 상장 종목 (섹터 포함)"""
    url = "https://api.nasdaq.com/api/screener/stocks"
    params = {
        "tableonly": "true",
        "limit": 10000,
        "offset": 0,
        "download": "true",
    }

    log.info("NASDAQ 스크리너 API 조회 중...")
    resp = requests.get(url, headers=HEADERS, params=params, timeout=60)
    resp.raise_for_status()

    data = resp.json()
    rows = data.get("data", {}).get("rows", [])
    log.info(f"  API 응답: {len(rows)}개 종목")

    result = []
    for row in rows:
        symbol = (row.get("symbol") or "").strip()
        name = (row.get("name") or "").strip()
        sector = (row.get("sector") or "").strip() or None
        industry = (row.get("industry") or "").strip() or None

        if not symbol or not name:
            continue
        if not VALID_TICKER.match(symbol):
            continue

        result.append({
            "ticker": symbol,
            "name": name[:100],
            "sector": sector,
            "industry": industry,
            "assetType": "STOCK",
        })

    log.info(f"  유효 종목: {len(result)}개")
    return result


def fetch_nasdaq_etfs() -> list[dict]:
    """NASDAQ ETF 목록"""
    url = "https://api.nasdaq.com/api/screener/etf"
    params = {"limit": 5000, "offset": 0, "download": "true"}

    log.info("NASDAQ ETF 목록 조회 중...")
    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        rows = data.get("data", {}).get("data", {}).get("rows", [])
        result = []
        for row in rows:
            symbol = (row.get("symbol") or "").strip()
            name = (row.get("companyName") or row.get("name") or "").strip()
            if not symbol or not name or not VALID_TICKER.match(symbol):
                continue
            result.append({
                "ticker": symbol,
                "name": name,
                "sector": None,
                "industry": None,
                "assetType": "ETF",
            })
        log.info(f"  ETF: {len(result)}개")
        return result
    except Exception as e:
        log.warning(f"  ETF 조회 실패 (무시): {e}")
        return []


def upsert(securities: list[dict]) -> tuple[int, int]:
    sql = text("""
        INSERT INTO securities (ticker, name, sector, industry, country, assetType, createdAt)
        VALUES (:ticker, :name, :sector, :industry, 'US', :assetType, NOW())
        ON DUPLICATE KEY UPDATE
            name      = IF(name IS NULL OR name = '', VALUES(name), name),
            sector    = IF(sector IS NULL, VALUES(sector), sector),
            industry  = IF(industry IS NULL, VALUES(industry), industry),
            country   = 'US',
            assetType = VALUES(assetType)
    """)
    inserted = 0
    skipped = 0
    with engine.begin() as conn:
        for s in securities:
            try:
                conn.execute(sql, s)
                inserted += 1
            except Exception as e:
                log.warning(f"  SKIP {s['ticker']}: {e}")
                skipped += 1
    return inserted, skipped


def main():
    t0 = datetime.now()
    log.info("=" * 60)
    log.info("미국 전체 종목 시드 시작")

    stocks = fetch_nasdaq_screener()
    time.sleep(1)
    etfs = fetch_nasdaq_etfs()

    # 중복 제거
    seen: set[str] = set()
    combined: list[dict] = []
    for s in stocks + etfs:
        if s["ticker"] not in seen:
            seen.add(s["ticker"])
            combined.append(s)

    log.info(f"총 {len(combined)}개 upsert 시작 (주식 {len(stocks)}개 + ETF {len(etfs)}개)...")
    inserted, skipped = upsert(combined)

    elapsed = round((datetime.now() - t0).total_seconds(), 1)
    log.info(f"완료 — {elapsed}s | 처리: {inserted}개 | 스킵: {skipped}개")


if __name__ == "__main__":
    main()
