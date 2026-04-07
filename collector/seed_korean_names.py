"""
주요 종목 한글명(displayNameKo, searchText)을 DB에 업데이트합니다.
실행: python seed_korean_names.py
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
        logging.FileHandler(LOG_DIR / f"{datetime.now().strftime('%Y-%m-%d')}-ko.log", encoding="utf-8"),
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

# ticker → (displayNameKo, searchText)
KO_NAMES: dict[str, tuple[str, str]] = {
    # ── 빅테크 / IT ─────────────────────────────────────────────────────────
    "AAPL":  ("애플",         "애플 아이폰 맥북 아이패드 apple iphone macbook"),
    "MSFT":  ("마이크로소프트","마이크로소프트 윈도우 오피스 azure microsoft windows"),
    "NVDA":  ("엔비디아",      "엔비디아 gpu 그래픽카드 ai nvidia"),
    "GOOGL": ("알파벳(구글)",  "구글 알파벳 유튜브 google alphabet youtube"),
    "GOOG":  ("알파벳(구글)",  "구글 알파벳 유튜브 google alphabet youtube"),
    "META":  ("메타",          "메타 페이스북 인스타그램 meta facebook instagram"),
    "AMZN":  ("아마존",        "아마존 쇼핑 aws amazon"),
    "TSLA":  ("테슬라",        "테슬라 전기차 머스크 tesla elon"),
    "AVGO":  ("브로드컴",      "브로드컴 반도체 broadcom"),
    "ORCL":  ("오라클",        "오라클 데이터베이스 oracle database"),
    "AMD":   ("AMD",           "amd 반도체 cpu gpu 라이젠 ryzen"),
    "INTC":  ("인텔",          "인텔 cpu 반도체 intel"),
    "QCOM":  ("퀄컴",          "퀄컴 모바일 스냅드래곤 qualcomm snapdragon"),
    "TXN":   ("텍사스인스트루먼트","텍사스인스트루먼트 반도체 texas instruments"),
    "CRM":   ("세일즈포스",    "세일즈포스 crm 클라우드 salesforce"),
    "NOW":   ("서비스나우",    "서비스나우 servicenow 클라우드"),
    "ADBE":  ("어도비",        "어도비 포토샵 adobe photoshop"),
    "INTU":  ("인튜이트",      "인튜이트 세금 turbotax intuit"),
    "AMAT":  ("어플라이드머티리얼즈","어플라이드머티리얼즈 반도체장비 applied materials"),
    "LRCX":  ("램리서치",      "램리서치 반도체장비 lam research"),
    "KLAC":  ("KLA",           "kla 반도체장비"),
    "MRVL":  ("마벨테크놀로지","마벨 반도체 marvell technology"),
    "MU":    ("마이크론",      "마이크론 메모리 반도체 micron memory"),
    "CDNS":  ("케이던스",      "케이던스 eda 반도체설계 cadence"),
    "SNPS":  ("시놉시스",      "시놉시스 eda 반도체설계 synopsys"),
    "HPQ":   ("HP",            "hp 프린터 컴퓨터 hewlett packard"),
    "DELL":  ("델테크놀로지스","델 컴퓨터 서버 dell technologies"),
    "IBM":   ("IBM",           "ibm 컴퓨터 클라우드"),
    "ACN":   ("액센추어",      "액센추어 컨설팅 accenture"),

    # ── 금융 ────────────────────────────────────────────────────────────────
    "BRK-B": ("버크셔해서웨이","버크셔 해서웨이 워렌버핏 berkshire hathaway buffett"),
    "JPM":   ("JP모건",        "JP모건 은행 jpmorgan chase"),
    "V":     ("비자",          "비자카드 visa"),
    "MA":    ("마스터카드",    "마스터카드 mastercard"),
    "BAC":   ("뱅크오브아메리카","뱅크오브아메리카 bank of america"),
    "WFC":   ("웰스파고",      "웰스파고 은행 wells fargo"),
    "GS":    ("골드만삭스",    "골드만삭스 투자은행 goldman sachs"),
    "MS":    ("모건스탠리",    "모건스탠리 투자은행 morgan stanley"),
    "C":     ("씨티그룹",      "씨티 은행 citigroup"),
    "AXP":   ("아메리칸익스프레스","아메리칸 익스프레스 카드 american express amex"),
    "SPGI":  ("S&P글로벌",     "sp글로벌 신용평가 s&p global"),
    "COF":   ("캐피털원",      "캐피털원 카드 capital one"),
    "BLK":   ("블랙록",        "블랙록 자산운용 blackrock"),
    "SCHW":  ("찰스슈왑",      "찰스슈왑 증권 charles schwab"),
    "CB":    ("처브",          "처브 보험 chubb"),
    "PGR":   ("프로그레시브",  "프로그레시브 보험 progressive"),
    "MMC":   ("마쉬맥레넌",    "마쉬 보험 marsh mclennan"),
    "ICE":   ("인터컨티넨탈익스체인지","인터컨티넨탈 거래소 intercontinental exchange"),

    # ── 헬스케어 ────────────────────────────────────────────────────────────
    "LLY":   ("일라이릴리",    "일라이릴리 제약 비만치료제 ozempic eli lilly"),
    "UNH":   ("유나이티드헬스","유나이티드헬스 의료보험 unitedhealth"),
    "JNJ":   ("존슨앤드존슨",  "존슨앤존슨 제약 johnson johnson"),
    "ABBV":  ("애브비",        "애브비 제약 humira abbvie"),
    "MRK":   ("머크",          "머크 제약 키트루다 merck keytruda"),
    "PFE":   ("화이자",        "화이자 백신 제약 pfizer covid"),
    "TMO":   ("써모피셔",      "써모피셔 바이오장비 thermo fisher"),
    "ABT":   ("애보트",        "애보트 의료기기 abbott"),
    "DHR":   ("다나허",        "다나허 바이오 danaher"),
    "AMGN":  ("암젠",          "암젠 바이오 amgen"),
    "GILD":  ("길리어드",      "길리어드 바이오 제약 gilead"),
    "ISRG":  ("인튜이티브서지컬","인튜이티브서지컬 수술로봇 intuitive surgical"),
    "REGN":  ("리제네론",      "리제네론 바이오 regeneron"),
    "VRTX":  ("버텍스파마",    "버텍스 제약 vertex pharmaceuticals"),
    "BSX":   ("보스턴사이언티픽","보스턴사이언티픽 의료기기 boston scientific"),
    "MDT":   ("메드트로닉",    "메드트로닉 의료기기 medtronic"),
    "SYK":   ("스트라이커",    "스트라이커 의료기기 stryker"),
    "ELV":   ("엘레반스헬스",  "엘레반스 의료보험 elevance health"),
    "CVS":   ("CVS헬스",       "cvs 약국 health"),

    # ── 소비재 ──────────────────────────────────────────────────────────────
    "AMZN":  ("아마존",        "아마존 쇼핑 aws amazon"),
    "TSLA":  ("테슬라",        "테슬라 전기차 머스크 tesla"),
    "HD":    ("홈디포",        "홈디포 인테리어 home depot"),
    "MCD":   ("맥도날드",      "맥도날드 패스트푸드 mcdonalds"),
    "NKE":   ("나이키",        "나이키 운동화 스포츠 nike"),
    "SBUX":  ("스타벅스",      "스타벅스 커피 starbucks"),
    "TGT":   ("타겟",          "타겟 마트 target"),
    "LOW":   ("로우스",        "로우스 인테리어 lowe's"),
    "BKNG":  ("부킹홀딩스",    "부킹 호텔예약 booking holdings"),
    "MAR":   ("메리어트",      "메리어트 호텔 marriott"),
    "HLT":   ("힐튼",          "힐튼 호텔 hilton"),
    "GM":    ("제너럴모터스",  "제너럴모터스 자동차 general motors"),
    "F":     ("포드",          "포드 자동차 ford"),
    "ABNB":  ("에어비앤비",    "에어비앤비 숙박 airbnb"),
    "EBAY":  ("이베이",        "이베이 쇼핑 ebay"),
    "ORLY":  ("오라일리오토",  "오라일리 자동차부품 o'reilly auto"),

    # ── 필수소비재 ──────────────────────────────────────────────────────────
    "PG":    ("P&G",           "pg 프록터앤갬블 생활용품 procter gamble"),
    "KO":    ("코카콜라",      "코카콜라 음료 coca cola"),
    "PEP":   ("펩시코",        "펩시 음료 스낵 pepsico"),
    "WMT":   ("월마트",        "월마트 마트 walmart"),
    "COST":  ("코스트코",      "코스트코 창고마트 costco"),
    "PM":    ("필립모리스",    "필립모리스 담배 philip morris"),
    "MO":    ("알트리아",      "알트리아 담배 altria"),
    "MDLZ":  ("몬델리즈",      "몬델리즈 과자 오레오 mondelez oreo"),
    "KHC":   ("크래프트하인즈","크래프트 하인즈 식품 kraft heinz"),
    "CL":    ("콜게이트",      "콜게이트 치약 생활용품 colgate"),

    # ── 에너지 ──────────────────────────────────────────────────────────────
    "XOM":   ("엑슨모빌",      "엑슨모빌 석유 exxon mobil"),
    "CVX":   ("쉐브론",        "쉐브론 석유 chevron"),
    "COP":   ("코노코필립스",  "코노코 석유 conocophillips"),
    "SLB":   ("슐럼버거",      "슐럼버거 유전서비스 schlumberger"),
    "EOG":   ("EOG리소시스",   "eog 석유 resources"),
    "OXY":   ("옥시덴탈",      "옥시덴탈 석유 occidental petroleum"),
    "PSX":   ("필립스66",      "필립스 정유 phillips 66"),
    "MPC":   ("마라톤페트롤",  "마라톤 정유 marathon petroleum"),
    "VLO":   ("발레로",        "발레로 정유 valero energy"),

    # ── 산업재 ──────────────────────────────────────────────────────────────
    "CAT":   ("캐터필러",      "캐터필러 건설기계 caterpillar"),
    "BA":    ("보잉",          "보잉 항공기 boeing"),
    "HON":   ("허니웰",        "허니웰 산업 honeywell"),
    "UPS":   ("UPS",           "ups 택배 물류 united parcel service"),
    "RTX":   ("레이시온",      "레이시온 방산 raytheon"),
    "LMT":   ("록히드마틴",    "록히드 마틴 방산 lockheed martin"),
    "NOC":   ("노스럽그루먼",  "노스럽 방산 northrop grumman"),
    "GE":    ("GE에어로스페이스","ge 항공엔진 ge aerospace"),
    "DE":    ("존디어",        "존디어 농기계 john deere"),
    "EMR":   ("에머슨일렉트릭","에머슨 산업자동화 emerson electric"),
    "ETN":   ("이튼",          "이튼 전력 eaton"),
    "PH":    ("파커하니핀",    "파커 산업 parker hannifin"),
    "FDX":   ("페덱스",        "페덱스 택배 물류 fedex"),

    # ── 통신 ────────────────────────────────────────────────────────────────
    "NFLX":  ("넷플릭스",      "넷플릭스 스트리밍 영상 netflix"),
    "DIS":   ("월트디즈니",    "디즈니 월트디즈니 disney"),
    "CMCSA": ("컴캐스트",      "컴캐스트 케이블 comcast"),
    "T":     ("AT&T",          "at&t 통신 att"),
    "VZ":    ("버라이즌",      "버라이즌 통신 verizon"),
    "CHTR":  ("차터커뮤니케이션","차터 케이블 charter communications"),
    "WBD":   ("워너브라더스디스커버리","워너 미디어 warner bros discovery"),

    # ── 부동산 / 유틸리티 ────────────────────────────────────────────────────
    "NEE":   ("넥스트에라에너지","넥스트에라 에너지 nextera energy"),
    "DUK":   ("듀크에너지",    "듀크 에너지 duke energy"),
    "SO":    ("서던컴퍼니",    "서던 에너지 southern company"),
    "AMT":   ("아메리칸타워",  "아메리칸 타워 통신탑 american tower"),
    "PLD":   ("프롤로지스",    "프롤로지스 물류창고 prologis"),
    "EQIX":  ("에퀴닉스",      "에퀴닉스 데이터센터 equinix"),
    "CCI":   ("크라운캐슬",    "크라운캐슬 통신탑 crown castle"),

    # ── ETF ─────────────────────────────────────────────────────────────────
    "VOO":   ("뱅가드 S&P500 ETF", "뱅가드 sp500 etf vanguard"),
    "SPY":   ("SPDR S&P500 ETF",   "spdr sp500 etf"),
    "QQQ":   ("인베스코 나스닥100 ETF","나스닥100 qqq invesco"),
    "IWM":   ("아이쉐어즈 러셀2000 ETF","러셀2000 소형주 etf ishares"),
    "VTI":   ("뱅가드 전체주식 ETF","미국전체주식시장 etf vanguard vti"),
    "EFA":   ("선진국 ETF",        "선진국 msci eafe etf ishares"),
    "EEM":   ("신흥국 ETF",        "신흥국 이머징마켓 etf ishares"),
    "GLD":   ("금 ETF",            "금 골드 etf spdr gld"),
    "TLT":   ("미국 장기채 ETF",   "장기국채 etf ishares tlt 20년"),
    "AGG":   ("미국 채권 ETF",     "채권 bond etf ishares agg"),
    "SCHD":  ("찰스슈왑 배당 ETF", "배당 dividend etf schwab schd"),
    "VNQ":   ("뱅가드 리츠 ETF",   "리츠 부동산 etf vanguard reit"),
    "ARKK":  ("ARK 혁신 ETF",      "ark 혁신 테마 etf cathie wood"),
    "JEPI":  ("JP모건 커버드콜 ETF","커버드콜 배당 etf jpmorgan jepi"),
    "SOXL":  ("반도체 3배 레버리지 ETF","반도체 레버리지 etf soxl direxion"),

    # ── 기타 주요 종목 ────────────────────────────────────────────────────────
    "PYPL":  ("페이팔",        "페이팔 결제 paypal"),
    "SQ":    ("블록(스퀘어)",  "스퀘어 블록 핀테크 block square"),
    "UBER":  ("우버",          "우버 택시 우버이츠 uber"),
    "LYFT":  ("리프트",        "리프트 택시 lyft"),
    "SNAP":  ("스냅챗",        "스냅챗 소셜미디어 snapchat snap"),
    "PINS":  ("핀터레스트",    "핀터레스트 소셜미디어 pinterest"),
    "SPOT":  ("스포티파이",    "스포티파이 음악스트리밍 spotify"),
    "COIN":  ("코인베이스",    "코인베이스 암호화폐 거래소 coinbase"),
    "HOOD":  ("로빈후드",      "로빈후드 주식거래 robinhood"),
    "PLTR":  ("팔란티어",      "팔란티어 ai 데이터분석 palantir"),
    "SNOW":  ("스노우플레이크","스노우플레이크 클라우드 데이터 snowflake"),
    "NET":   ("클라우드플레어","클라우드플레어 보안 cloudflare"),
    "DDOG":  ("데이터독",      "데이터독 모니터링 datadog"),
    "ZS":    ("지스케일러",    "제트스케일러 보안 클라우드 zscaler"),
    "CRWD":  ("크라우드스트라이크","크라우드스트라이크 사이버보안 crowdstrike"),
    "PANW":  ("팔로알토네트웍스","팔로알토 보안 palo alto networks"),
    "FTNT":  ("포티넷",        "포티넷 보안 fortinet"),
    "MDB":   ("몽고DB",        "몽고db 데이터베이스 mongodb"),
    "TEAM":  ("아틀라시안",    "아틀라시안 지라 confluence atlassian jira"),
    "WDAY":  ("워크데이",      "워크데이 hr 클라우드 workday"),
    "ZM":    ("줌",            "줌 화상회의 zoom"),
    "OKTA":  ("옥타",          "옥타 인증 보안 okta"),
    "HUBS":  ("허브스팟",      "허브스팟 마케팅 hubspot"),
    "TTD":   ("트레이드데스크","트레이드데스크 광고 the trade desk"),
    "RBLX":  ("로블록스",      "로블록스 게임 roblox"),
    "U":     ("유니티",        "유니티 게임엔진 unity"),
    "EA":    ("일렉트로닉아츠","일렉트로닉 아츠 게임 electronic arts"),
    "TTWO":  ("테이크투인터랙티브","테이크투 게임 gta take-two interactive"),
    "NFLX":  ("넷플릭스",      "넷플릭스 스트리밍 netflix"),
    "LI":    ("리오토",        "리오토 중국 전기차 li auto"),
    "NIO":   ("니오",          "니오 중국 전기차 nio"),
    "XPEV":  ("샤오펑",        "샤오펑 중국 전기차 xpeng"),
    "BABA":  ("알리바바",      "알리바바 중국 전자상거래 alibaba"),
    "JD":    ("징동",          "징동 중국 쇼핑 jd.com"),
    "PDD":   ("핀둬둬",        "핀둬둬 테무 temu pinduoduo"),
    "BIDU":  ("바이두",        "바이두 중국 검색 baidu"),
    "TSM":   ("TSMC",          "tsmc 대만 반도체 파운드리 taiwan semiconductor"),
}


def main():
    updated = 0
    not_found = []

    with engine.begin() as conn:
        for ticker, (ko_name, search_text) in KO_NAMES.items():
            result = conn.execute(
                text("UPDATE securities SET displayNameKo=:ko, searchText=:st WHERE ticker=:t"),
                {"ko": ko_name, "st": search_text, "t": ticker},
            )
            if result.rowcount > 0:
                updated += 1
                log.info(f"  {ticker:<8} → {ko_name}")
            else:
                not_found.append(ticker)

    log.info(f"\n완료 — 업데이트: {updated}개 | DB에 없음: {len(not_found)}개")
    if not_found:
        log.info(f"없는 종목: {not_found}")


if __name__ == "__main__":
    main()
