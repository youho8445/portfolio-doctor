"""
FinanceDataReader로 KOSPI + KOSDAQ 전체 종목을 가져와 securities 테이블에 upsert합니다.
약 2,400개 종목 (한글명 + 섹터 포함)
실행: python seed_kr_all.py

의존성: pip install finance-datareader
"""
import os
import sys
import logging
from pathlib import Path
from datetime import datetime

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

try:
    import FinanceDataReader as fdr
except ImportError:
    print("FinanceDataReader가 설치되어 있지 않습니다. 'pip install finance-datareader' 를 실행하세요.")
    sys.exit(1)

# ── 로그 설정 ─────────────────────────────────────────────────────────────────
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
_today = datetime.now().strftime("%Y-%m-%d")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_DIR / f"{_today}-seed-kr-all.log", encoding="utf-8"),
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


def fetch_kr_securities() -> list[dict]:
    securities = []

    for market, suffix in [("KOSPI", "KS"), ("KOSDAQ", "KQ")]:
        log.info(f"[{market}] 종목 목록 가져오는 중...")
        try:
            df = fdr.StockListing(market)
        except Exception as e:
            log.error(f"[{market}] 조회 실패: {e}")
            continue

        log.info(f"[{market}] {len(df)}개 종목 발견")

        for _, row in df.iterrows():
            # FinanceDataReader 컬럼: Code, Name, Sector, Industry 등 (버전마다 다름)
            code = str(row.get("Code") or row.get("Symbol") or "").strip().zfill(6)
            name = str(row.get("Name") or "").strip()
            sector = str(row.get("Sector") or row.get("Industry") or "").strip() or None
            industry = str(row.get("Industry") or "").strip() or None

            if not code or not name or code == "nan":
                continue

            full_ticker = f"{code}.{suffix}"
            securities.append({
                "ticker": full_ticker,
                "name": name,
                "displayNameKo": name,
                "sector": sector,
                "industry": industry,
                "country": "KR",
                "assetType": "STOCK",
            })

        log.info(f"[{market}] {len([s for s in securities if s['ticker'].endswith(suffix)])}개 파싱 완료")

    return securities


def upsert(securities: list[dict]) -> tuple[int, int]:
    sql = text("""
        INSERT INTO securities (ticker, name, displayNameKo, sector, industry, country, assetType, createdAt)
        VALUES (:ticker, :name, :displayNameKo, :sector, :industry, :country, :assetType, NOW())
        ON DUPLICATE KEY UPDATE
            name          = VALUES(name),
            displayNameKo = VALUES(displayNameKo),
            sector        = IF(sector IS NULL, VALUES(sector), sector),
            industry      = IF(industry IS NULL, VALUES(industry), industry),
            country       = VALUES(country),
            assetType     = VALUES(assetType)
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
    log.info("한국 전체 종목 시드 시작 (KOSPI + KOSDAQ)")

    securities = fetch_kr_securities()

    if not securities:
        log.error("종목을 가져오지 못했습니다.")
        return

    log.info(f"총 {len(securities)}개 종목 upsert 시작...")
    inserted, skipped = upsert(securities)

    elapsed = round((datetime.now() - t0).total_seconds(), 1)
    log.info(f"완료 — {elapsed}s | 처리: {inserted}개 | 스킵: {skipped}개")


if __name__ == "__main__":
    main()
