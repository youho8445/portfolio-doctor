"""
국내 주요 종목(KOSPI / KOSDAQ)을 securities 테이블에 upsert하고
displayNameKo / searchText 도 함께 설정합니다.

티커 형식:
  KOSPI  → 6자리숫자.KS   예) 005930.KS
  KOSDAQ → 6자리숫자.KQ   예) 035720.KQ

실행: python seed_korean_stocks.py
"""
import os
import sys
import logging
from pathlib import Path
from datetime import datetime

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    handlers=[
        logging.FileHandler(
            LOG_DIR / f"{datetime.now().strftime('%Y-%m-%d')}-kr-seed.log",
            encoding="utf-8",
        ),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

load_dotenv()
DATABASE_URL = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
engine = create_engine(DATABASE_URL, future=True)

# ── 종목 데이터 ───────────────────────────────────────────────────────────────
# (ticker, 영문명, 한글명, 섹터, searchText, 거래소)
KR_STOCKS: list[tuple[str, str, str, str, str, str]] = [

    # ── KOSPI ─────────────────────────────────────────────────────────────────
    ("005930.KS", "Samsung Electronics",         "삼성전자",       "Information Technology",
     "삼성전자 반도체 갤럭시 스마트폰 메모리",                       "KOSPI"),
    ("000660.KS", "SK Hynix",                    "SK하이닉스",     "Information Technology",
     "sk하이닉스 반도체 메모리 dram",                               "KOSPI"),
    ("207940.KS", "Samsung Biologics",           "삼성바이오로직스","Health Care",
     "삼성바이오로직스 바이오 위탁생산 cmo",                        "KOSPI"),
    ("005380.KS", "Hyundai Motor",               "현대자동차",     "Consumer Discretionary",
     "현대자동차 자동차 전기차 현대차",                              "KOSPI"),
    ("000270.KS", "Kia",                         "기아",           "Consumer Discretionary",
     "기아 자동차 전기차 ev6",                                       "KOSPI"),
    ("068270.KS", "Celltrion",                   "셀트리온",       "Health Care",
     "셀트리온 바이오시밀러 제약",                                   "KOSPI"),
    ("005490.KS", "POSCO Holdings",              "POSCO홀딩스",    "Materials",
     "포스코 철강 posco",                                            "KOSPI"),
    ("035420.KS", "NAVER",                       "네이버",         "Communication Services",
     "네이버 검색 포털 웹툰 naver",                                  "KOSPI"),
    ("051910.KS", "LG Chem",                     "LG화학",         "Materials",
     "lg화학 배터리 화학 2차전지",                                   "KOSPI"),
    ("006400.KS", "Samsung SDI",                 "삼성SDI",        "Information Technology",
     "삼성sdi 배터리 전기차 2차전지",                                "KOSPI"),
    ("028260.KS", "Samsung C&T",                 "삼성물산",       "Industrials",
     "삼성물산 건설 패션 상사",                                      "KOSPI"),
    ("012330.KS", "Hyundai Mobis",               "현대모비스",     "Consumer Discretionary",
     "현대모비스 자동차부품 모비스",                                  "KOSPI"),
    ("055550.KS", "Shinhan Financial Group",     "신한지주",       "Financials",
     "신한지주 신한은행 금융",                                        "KOSPI"),
    ("105560.KS", "KB Financial Group",          "KB금융",         "Financials",
     "kb금융 국민은행 금융",                                         "KOSPI"),
    ("035720.KS", "Kakao",                       "카카오",         "Communication Services",
     "카카오 카카오톡 카카오페이 메신저",                             "KOSPI"),
    ("096770.KS", "SK Innovation",               "SK이노베이션",   "Energy",
     "sk이노베이션 배터리 정유 sk에너지",                            "KOSPI"),
    ("003550.KS", "LG",                          "LG",             "Industrials",
     "lg 엘지 지주회사",                                             "KOSPI"),
    ("066570.KS", "LG Electronics",              "LG전자",         "Consumer Discretionary",
     "lg전자 가전 스마트폰 올레드 tv",                               "KOSPI"),
    ("032830.KS", "Samsung Life Insurance",      "삼성생명",       "Financials",
     "삼성생명 보험 금융",                                            "KOSPI"),
    ("017670.KS", "SK Telecom",                  "SK텔레콤",       "Communication Services",
     "sk텔레콤 통신 5g skt",                                         "KOSPI"),
    ("030200.KS", "KT",                          "KT",             "Communication Services",
     "kt 통신 인터넷 5g",                                            "KOSPI"),
    ("034730.KS", "SK",                          "SK",             "Industrials",
     "sk 지주회사 sk그룹",                                           "KOSPI"),
    ("009150.KS", "Samsung Electro-Mechanics",   "삼성전기",       "Information Technology",
     "삼성전기 mlcc 전자부품",                                        "KOSPI"),
    ("003490.KS", "Korean Air",                  "대한항공",       "Industrials",
     "대한항공 항공사 항공",                                          "KOSPI"),
    ("010950.KS", "S-Oil",                       "S-Oil",          "Energy",
     "s-oil 정유 에쓰오일",                                          "KOSPI"),
    ("009540.KS", "HD Korea Shipbuilding",       "HD한국조선해양", "Industrials",
     "한국조선해양 조선 현대중공업",                                  "KOSPI"),
    ("000810.KS", "Samsung Fire & Marine",       "삼성화재",       "Financials",
     "삼성화재 손해보험 보험",                                        "KOSPI"),
    ("011170.KS", "Lotte Chemical",              "롯데케미칼",     "Materials",
     "롯데케미칼 화학 플라스틱",                                     "KOSPI"),
    ("018260.KS", "Samsung SDS",                 "삼성SDS",        "Information Technology",
     "삼성sds it서비스 클라우드",                                    "KOSPI"),
    ("047050.KS", "Posco International",         "포스코인터내셔널","Industrials",
     "포스코인터내셔널 무역 상사",                                   "KOSPI"),
    ("015760.KS", "Korea Electric Power",        "한국전력",       "Utilities",
     "한국전력 전기 한전 kepco",                                     "KOSPI"),
    ("086790.KS", "Hana Financial Group",        "하나금융지주",   "Financials",
     "하나금융 하나은행 금융",                                        "KOSPI"),
    ("010130.KS", "Korea Zinc",                  "고려아연",       "Materials",
     "고려아연 아연 비철금속",                                        "KOSPI"),
    ("138040.KS", "Meritz Financial Group",      "메리츠금융지주", "Financials",
     "메리츠금융 보험 금융",                                          "KOSPI"),
    ("329180.KS", "HD Hyundai Heavy Industries", "HD현대중공업",   "Industrials",
     "현대중공업 조선 hd현대",                                       "KOSPI"),
    ("000100.KS", "Yuhan",                       "유한양행",       "Health Care",
     "유한양행 제약 의약품",                                          "KOSPI"),
    ("071050.KS", "Korea Investment Holdings",   "한국금융지주",   "Financials",
     "한국금융지주 한국투자증권 금융",                                "KOSPI"),
    ("024110.KS", "Industrial Bank of Korea",    "기업은행",       "Financials",
     "기업은행 ibk 은행",                                             "KOSPI"),
    ("090430.KS", "Amorepacific",                "아모레퍼시픽",   "Consumer Staples",
     "아모레퍼시픽 화장품 뷰티 설화수",                              "KOSPI"),
    ("161390.KS", "Hanwha Solutions",            "한화솔루션",     "Materials",
     "한화솔루션 태양광 화학",                                        "KOSPI"),
    ("000720.KS", "Hyundai E&C",                 "현대건설",       "Industrials",
     "현대건설 건설 아파트",                                          "KOSPI"),
    ("011200.KS", "HMM",                         "HMM",            "Industrials",
     "hmm 한국해운 컨테이너 해운",                                   "KOSPI"),
    ("004020.KS", "Hyundai Steel",               "현대제철",       "Materials",
     "현대제철 철강 제철",                                            "KOSPI"),
    ("036460.KS", "Korea Gas",                   "한국가스공사",   "Utilities",
     "한국가스공사 가스 kogas",                                       "KOSPI"),
    ("402340.KS", "Samsung SDS (new)",           "씨에스윈드",     "Industrials",
     "씨에스윈드 풍력 신재생에너지",                                 "KOSPI"),
    ("259960.KS", "Krafton",                     "크래프톤",       "Communication Services",
     "크래프톤 배그 게임 pubg",                                       "KOSPI"),
    ("316140.KS", "Woori Financial Group",       "우리금융지주",   "Financials",
     "우리금융 우리은행 금융",                                        "KOSPI"),

    # ── KOSDAQ ────────────────────────────────────────────────────────────────
    ("247540.KQ", "Ecopro BM",                   "에코프로비엠",   "Materials",
     "에코프로비엠 양극재 배터리 2차전지",                           "KOSDAQ"),
    ("086520.KQ", "Ecopro",                       "에코프로",       "Materials",
     "에코프로 2차전지 배터리 양극재",                               "KOSDAQ"),
    ("196170.KQ", "Alteogen",                     "알테오젠",       "Health Care",
     "알테오젠 바이오 항체 피하주사",                                "KOSDAQ"),
    ("041510.KQ", "SM Entertainment",            "SM엔터테인먼트", "Communication Services",
     "sm엔터 케이팝 kpop 아이돌 sm",                                 "KOSDAQ"),
    ("035900.KQ", "JYP Entertainment",           "JYP엔터테인먼트","Communication Services",
     "jyp엔터 케이팝 kpop 아이돌 트와이스 stray kids",              "KOSDAQ"),
    ("352820.KQ", "HYBE",                         "하이브",         "Communication Services",
     "하이브 bts 방탄소년단 케이팝 kpop",                            "KOSDAQ"),
    ("122870.KQ", "YG Entertainment",            "YG엔터테인먼트", "Communication Services",
     "yg엔터 케이팝 블랙핑크 kpop",                                  "KOSDAQ"),
    ("263750.KQ", "Pearl Abyss",                  "펄어비스",       "Communication Services",
     "펄어비스 게임 검은사막",                                        "KOSDAQ"),
    ("112040.KQ", "Witooz (Wemade)",              "위메이드",       "Communication Services",
     "위메이드 게임 블록체인 wemix",                                  "KOSDAQ"),
    ("067160.KQ", "Hugel",                        "휴젤",           "Health Care",
     "휴젤 보톡스 의약품 바이오",                                    "KOSDAQ"),
    ("214150.KQ", "Classys",                      "클래시스",       "Health Care",
     "클래시스 의료기기 피부미용",                                   "KOSDAQ"),
    ("145020.KQ", "Hugel (Ildong)",               "일동제약",       "Health Care",
     "일동제약 제약 의약품",                                          "KOSDAQ"),
    ("039030.KQ", "Itswell",                      "이오테크닉스",   "Information Technology",
     "이오테크닉스 레이저 반도체장비",                               "KOSDAQ"),
    ("357780.KQ", "SFA Engineering",              "솔브레인",       "Information Technology",
     "솔브레인 반도체소재 화학",                                     "KOSDAQ"),
    ("240810.KQ", "Wonbic",                       "원익IPS",        "Information Technology",
     "원익ips 반도체장비 증착",                                      "KOSDAQ"),
    ("091990.KQ", "Celltrion Healthcare",         "셀트리온헬스케어","Health Care",
     "셀트리온헬스케어 바이오 의약품",                               "KOSDAQ"),
    ("078340.KQ", "Korea Asset In Trust",         "컴투스",         "Communication Services",
     "컴투스 게임 모바일게임",                                        "KOSDAQ"),
    ("036570.KQ", "NCSoft",                       "엔씨소프트",     "Communication Services",
     "엔씨소프트 게임 리니지 nc",                                    "KOSDAQ"),
    ("251270.KQ", "Netmarble",                    "넷마블",         "Communication Services",
     "넷마블 게임 모바일게임",                                        "KOSDAQ"),
    ("293490.KQ", "Kakao Games",                  "카카오게임즈",   "Communication Services",
     "카카오게임즈 게임 모바일",                                     "KOSDAQ"),
    ("950130.KQ", "Esol (Ecochem)",               "엑스페릭스",     "Materials",
     "엑스페릭스 배터리 소재",                                        "KOSDAQ"),
    ("096530.KQ", "Seegene",                      "씨젠",           "Health Care",
     "씨젠 진단키트 코로나 pcr",                                     "KOSDAQ"),
    ("950170.KQ", "JB Financial Group",           "카카오뱅크",     "Financials",
     "카카오뱅크 인터넷은행 금융",                                   "KOSDAQ"),
    ("377300.KQ", "Kakao Pay",                    "카카오페이",     "Financials",
     "카카오페이 간편결제 핀테크",                                   "KOSDAQ"),
    ("403870.KQ", "Kakao Bank",                   "카카오뱅크2",    "Financials",
     "카카오뱅크 은행 인터넷은행",                                   "KOSDAQ"),
    ("035760.KQ", "CJ ENM",                       "CJ ENM",         "Communication Services",
     "cj enm 미디어 콘텐츠 방송",                                    "KOSDAQ"),
    ("067630.KQ", "HLB",                          "HLB",            "Health Care",
     "hlb 항암제 바이오 신약",                                        "KOSDAQ"),
    ("028300.KQ", "HLB Life Science",             "HLB생명과학",    "Health Care",
     "hlb생명과학 바이오 의약품",                                    "KOSDAQ"),
    ("220180.KQ", "Ifs Corp (Seojin)",            "서진시스템",     "Information Technology",
     "서진시스템 통신장비 기지국",                                   "KOSDAQ"),
    ("064760.KQ", "TPC",                          "티씨케이",       "Information Technology",
     "티씨케이 반도체부품 SiC",                                      "KOSDAQ"),

    # ── 국내 ETF (KRX) ────────────────────────────────────────────────────────
    ("069500.KS", "KODEX 200",                    "KODEX 200",      "ETF",
     "코덱스 200 코스피 etf kodex",                                  "KOSPI"),
    ("102110.KS", "TIGER 200",                    "TIGER 200",      "ETF",
     "타이거 200 코스피 etf tiger",                                  "KOSPI"),
    ("114800.KS", "KODEX Inverse",                "KODEX 인버스",   "ETF",
     "코덱스 인버스 inverse etf 하락",                               "KOSPI"),
    ("122630.KS", "KODEX Leverage",               "KODEX 레버리지", "ETF",
     "코덱스 레버리지 leverage etf 2배",                             "KOSPI"),
    ("229200.KS", "KODEX KOSDAQ150",              "KODEX 코스닥150","ETF",
     "코덱스 코스닥150 kosdaq etf",                                  "KOSPI"),
    ("148020.KS", "KBSTAR 200",                   "KBSTAR 200",     "ETF",
     "kbstar 200 코스피 etf",                                         "KOSPI"),
    ("261220.KS", "KODEX 2차전지산업",            "KODEX 2차전지",  "ETF",
     "코덱스 2차전지 배터리 etf",                                    "KOSPI"),
    ("091160.KS", "KODEX Semiconductor",          "KODEX 반도체",   "ETF",
     "코덱스 반도체 semiconductor etf",                              "KOSPI"),
    ("091170.KS", "KODEX IT",                     "KODEX IT",       "ETF",
     "코덱스 it 기술 etf",                                            "KOSPI"),
    ("305720.KS", "KODEX 2차전지핵심소재",        "KODEX 2차전지핵심소재","ETF",
     "코덱스 2차전지 소재 etf 배터리",                               "KOSPI"),
]


def upsert_security(conn, ticker: str, name: str, display_ko: str, sector: str,
                    search_text: str, asset_type: str, country: str) -> bool:
    sql = text("""
        INSERT INTO securities
            (ticker, name, displayNameKo, sector, industry, country, assetType, searchText)
        VALUES
            (:ticker, :name, :displayNameKo, :sector, NULL, :country, :assetType, :searchText)
        ON DUPLICATE KEY UPDATE
            name          = VALUES(name),
            displayNameKo = VALUES(displayNameKo),
            sector        = VALUES(sector),
            country       = VALUES(country),
            assetType     = VALUES(assetType),
            searchText    = VALUES(searchText)
    """)
    result = conn.execute(sql, {
        "ticker": ticker,
        "name": name,
        "displayNameKo": display_ko,
        "sector": sector if asset_type != "ETF" else None,
        "country": country,
        "assetType": asset_type,
        "searchText": search_text,
    })
    return result.rowcount > 0


def main():
    success = 0
    failed: list[str] = []

    with engine.begin() as conn:
        for ticker, name, display_ko, sector, search_text, exchange in KR_STOCKS:
            country = "KR"
            # ETF 여부 판단: sector 값이 "ETF"이면 ETF
            asset_type = "ETF" if sector == "ETF" else "STOCK"
            actual_sector = None if asset_type == "ETF" else sector

            try:
                upsert_security(
                    conn, ticker, name, display_ko,
                    actual_sector or "", search_text, asset_type, country,
                )
                log.info(f"  {ticker:<16} {display_ko}")
                success += 1
            except Exception as e:
                log.error(f"  {ticker} 실패: {e}")
                failed.append(ticker)

    log.info(f"\n완료 — 저장: {success}개 | 실패: {len(failed)}개")
    if failed:
        log.warning(f"실패: {failed}")
        sys.exit(1)


if __name__ == "__main__":
    main()
