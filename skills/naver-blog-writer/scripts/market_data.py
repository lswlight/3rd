#!/usr/bin/env python3
"""시세를 가져와 볼린저 밴드 중심의 기술 지표를 계산한다 (파이썬 표준 라이브러리만 사용).

사용 예:
  python3 market_data.py KRW-BTC                 # 업비트 코인 (일봉)
  python3 market_data.py KRW-ETH --interval 240  # 업비트 4시간봉
  python3 market_data.py 005930.KS               # 야후 파이낸스 (삼성전자)
  python3 market_data.py NVDA --days 200
  python3 market_data.py MYDATA --csv prices.csv # 직접 준비한 CSV (date,open,high,low,close,volume)

결과는 블로그 글 작성에 바로 쓸 수 있는 마크다운 요약이다. --json 이면 JSON으로 출력한다.
"""
import argparse
import csv
import json
import math
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

UA = "Mozilla/5.0 (naver-blog-writer)"


# ---------------------------------------------------------------- 데이터 수집
def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"HTTP_ERROR {e.code}: {url}")
    except (urllib.error.URLError, OSError) as e:
        raise SystemExit(
            f"NETWORK_BLOCKED: {url} 에 접속하지 못했습니다 ({e}). "
            "코드 실행 환경의 네트워크 허용 도메인에 api.upbit.com / query1.finance.yahoo.com 을 추가하거나, "
            "시세 커넥터 데이터를 --csv 로 넘겨 주세요."
        )


def fetch_upbit(market, days, interval):
    if interval == "day":
        url = f"https://api.upbit.com/v1/candles/days?market={market}&count={min(days, 200)}"
    else:
        url = f"https://api.upbit.com/v1/candles/minutes/{interval}?market={market}&count={min(days, 200)}"
    rows = _get(url)
    if not isinstance(rows, list) or not rows:
        raise SystemExit(f"NO_DATA: 업비트에서 {market} 데이터를 받지 못했습니다. 마켓 코드(예: KRW-BTC)를 확인하세요.")
    rows.reverse()  # 업비트는 최신순 → 과거순으로
    return [
        {
            "date": r["candle_date_time_kst"].replace("T", " ")[:16],
            "open": r["opening_price"],
            "high": r["high_price"],
            "low": r["low_price"],
            "close": r["trade_price"],
            "volume": r["candle_acc_trade_volume"],
        }
        for r in rows
    ]


def fetch_yahoo(symbol, days, interval):
    rng = "1y" if days > 120 else "6mo"
    itv = "1d" if interval == "day" else "1h"
    if itv == "1h":
        rng = "1mo"
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range={rng}&interval={itv}"
    data = _get(url)
    try:
        res = data["chart"]["result"][0]
        q = res["indicators"]["quote"][0]
        ts = res["timestamp"]
    except (KeyError, TypeError, IndexError):
        raise SystemExit(f"NO_DATA: 야후에서 {symbol} 데이터를 받지 못했습니다. 국내 종목은 005930.KS(코스피)/035720.KQ(코스닥) 형식입니다.")
    out = []
    for i, t in enumerate(ts):
        c = q["close"][i]
        if c is None:
            continue
        out.append(
            {
                "date": datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%d %H:%M"),
                "open": q["open"][i] or c,
                "high": q["high"][i] or c,
                "low": q["low"][i] or c,
                "close": c,
                "volume": q["volume"][i] or 0,
            }
        )
    return out[-days:]


def load_csv(path):
    out = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            r = {k.strip().lower(): v for k, v in r.items()}
            c = float(r["close"])
            out.append(
                {
                    "date": r.get("date", ""),
                    "open": float(r.get("open") or c),
                    "high": float(r.get("high") or c),
                    "low": float(r.get("low") or c),
                    "close": c,
                    "volume": float(r.get("volume") or 0),
                }
            )
    return out


# ---------------------------------------------------------------- 지표 계산
def sma(xs, n):
    return [None if i < n - 1 else sum(xs[i - n + 1 : i + 1]) / n for i in range(len(xs))]


def bollinger(closes, n=20, k=2.0):
    mid = sma(closes, n)
    up, lo, pb, bw = [], [], [], []
    for i, m in enumerate(mid):
        if m is None:
            up.append(None), lo.append(None), pb.append(None), bw.append(None)
            continue
        win = closes[i - n + 1 : i + 1]
        sd = math.sqrt(sum((x - m) ** 2 for x in win) / n)
        u, l = m + k * sd, m - k * sd
        up.append(u)
        lo.append(l)
        pb.append((closes[i] - l) / (u - l) if u != l else 0.5)
        bw.append((u - l) / m * 100 if m else None)
    return mid, up, lo, pb, bw


def rsi(closes, n=14):
    if len(closes) <= n:
        return [None] * len(closes)
    out = [None] * len(closes)
    gains = [max(closes[i] - closes[i - 1], 0) for i in range(1, len(closes))]
    losses = [max(closes[i - 1] - closes[i], 0) for i in range(1, len(closes))]
    ag, al = sum(gains[:n]) / n, sum(losses[:n]) / n
    for i in range(n, len(closes)):
        if i > n:
            ag = (ag * (n - 1) + gains[i - 1]) / n
            al = (al * (n - 1) + losses[i - 1]) / n
        out[i] = 100.0 if al == 0 else 100 - 100 / (1 + ag / al)
    return out


def analyze(rows, period=20, k=2.0):
    if len(rows) < period + 5:
        raise SystemExit(f"NOT_ENOUGH_DATA: 최소 {period + 5}개 봉이 필요합니다 (현재 {len(rows)}개).")
    closes = [r["close"] for r in rows]
    vols = [r["volume"] for r in rows]
    mid, up, lo, pb, bw = bollinger(closes, period, k)
    ma5, ma60 = sma(closes, 5), sma(closes, 60)
    r14 = rsi(closes)
    i = len(rows) - 1

    valid_bw = [b for b in bw if b is not None]
    lookback = valid_bw[-120:]
    bw_rank = sum(1 for b in lookback if b <= bw[i]) / len(lookback) * 100  # 낮을수록 수축
    squeeze = bw_rank <= 15

    # 최근 5봉 동안 밴드 이탈/복귀 이벤트
    events = []
    for j in range(max(period, i - 4), i + 1):
        c, u, l = closes[j], up[j], lo[j]
        if c > u:
            events.append(f"{rows[j]['date']} 상단 돌파(종가 {fmt(c)} > 상단 {fmt(u)})")
        elif c < l:
            events.append(f"{rows[j]['date']} 하단 이탈(종가 {fmt(c)} < 하단 {fmt(l)})")
        prev = j - 1
        if mid[prev] is not None and closes[prev] < mid[prev] and c >= mid[j]:
            events.append(f"{rows[j]['date']} 중심선 상향 돌파")
        if mid[prev] is not None and closes[prev] > mid[prev] and c <= mid[j]:
            events.append(f"{rows[j]['date']} 중심선 하향 이탈")

    # 밴드 기울기 (중심선 5봉 변화율)
    slope = (mid[i] - mid[i - 5]) / mid[i - 5] * 100 if mid[i - 5] else 0
    if pb[i] >= 1:
        pos = "상단 밴드 위 (과열/강한 추세 구간)"
    elif pb[i] >= 0.8:
        pos = "상단 밴드 근접"
    elif pb[i] > 0.5:
        pos = "중심선~상단 사이 (상승 우위)"
    elif pb[i] > 0.2:
        pos = "하단~중심선 사이 (하락 우위)"
    elif pb[i] > 0:
        pos = "하단 밴드 근접"
    else:
        pos = "하단 밴드 아래 (과매도/강한 하락 구간)"

    vol20 = sum(vols[-20:]) / 20 if len(vols) >= 20 else None
    chg = lambda n: (closes[i] / closes[i - n] - 1) * 100 if i - n >= 0 else None
    return {
        "last_date": rows[i]["date"],
        "close": closes[i],
        "change_1": chg(1),
        "change_5": chg(5),
        "change_20": chg(20),
        "high_period": max(r["high"] for r in rows[-period:]),
        "low_period": min(r["low"] for r in rows[-period:]),
        "bb": {
            "period": period,
            "k": k,
            "upper": up[i],
            "middle": mid[i],
            "lower": lo[i],
            "percent_b": pb[i],
            "bandwidth_pct": bw[i],
            "bandwidth_rank_pct": bw_rank,
            "squeeze": squeeze,
            "mid_slope_5_pct": slope,
            "position": pos,
            "recent_events": events,
        },
        "ma5": ma5[i],
        "ma60": ma60[i],
        "rsi14": r14[i],
        "volume_vs_20avg": (vols[i] / vol20) if vol20 else None,
        "bars": len(rows),
    }


# ---------------------------------------------------------------- 출력
def fmt(x, d=None):
    if x is None:
        return "-"
    if d is None:
        d = 0 if abs(x) >= 1000 else (2 if abs(x) >= 1 else 6)
    return f"{x:,.{d}f}"


def pct(x):
    return "-" if x is None else f"{x:+.2f}%"


def to_markdown(symbol, src, interval, a):
    b = a["bb"]
    lines = [
        f"## {symbol} 지표 요약 ({src}, {'일봉' if interval == 'day' else interval + '분봉'}, 기준 {a['last_date']})",
        "",
        f"- 현재가: {fmt(a['close'])}  (1봉 {pct(a['change_1'])} / 5봉 {pct(a['change_5'])} / 20봉 {pct(a['change_20'])})",
        f"- 최근 {b['period']}봉 고가/저가: {fmt(a['high_period'])} / {fmt(a['low_period'])}",
        "",
        f"### 볼린저 밴드 ({b['period']}, {b['k']:g})",
        f"- 상단 {fmt(b['upper'])} / 중심 {fmt(b['middle'])} / 하단 {fmt(b['lower'])}",
        f"- %B: {b['percent_b']:.2f} → {b['position']}",
        f"- 밴드폭: {b['bandwidth_pct']:.2f}% (최근 120봉 중 하위 {b['bandwidth_rank_pct']:.0f}%){' → **스퀴즈(수축) 구간**' if b['squeeze'] else ''}",
        f"- 중심선 기울기(5봉): {pct(b['mid_slope_5_pct'])}",
        "- 최근 5봉 이벤트: " + ("; ".join(b["recent_events"]) if b["recent_events"] else "없음"),
        "",
        "### 보조 지표",
        f"- RSI(14): {fmt(a['rsi14'], 1)}",
        f"- MA5 / MA20 / MA60: {fmt(a['ma5'])} / {fmt(b['middle'])} / {fmt(a['ma60'])}",
        "- 거래량(20봉 평균 대비): " + ("-" if a["volume_vs_20avg"] is None else "%.2f배" % a["volume_vs_20avg"]),
    ]
    return "\n".join(lines)


def main():
    p = argparse.ArgumentParser(description="시세 + 볼린저 밴드 지표 요약")
    p.add_argument("symbol", help="KRW-BTC(업비트) / 005930.KS, NVDA(야후) / 임의 이름(--csv)")
    p.add_argument("--days", type=int, default=150, help="가져올 봉 개수 (기본 150)")
    p.add_argument("--interval", default="day", help="day(기본) 또는 업비트 분봉 1,3,5,15,30,60,240")
    p.add_argument("--period", type=int, default=20)
    p.add_argument("--k", type=float, default=2.0)
    p.add_argument("--csv", help="date,open,high,low,close,volume 헤더를 가진 CSV")
    p.add_argument("--json", action="store_true")
    a = p.parse_args()

    if a.csv:
        rows, src = load_csv(a.csv), "CSV"
    elif a.symbol.upper().startswith(("KRW-", "BTC-", "USDT-")):
        rows, src = fetch_upbit(a.symbol.upper(), a.days, a.interval), "업비트"
    else:
        rows, src = fetch_yahoo(a.symbol, a.days, a.interval), "Yahoo Finance"

    res = analyze(rows, a.period, a.k)
    if a.json:
        print(json.dumps({"symbol": a.symbol, "source": src, **res}, ensure_ascii=False, indent=2))
    else:
        print(to_markdown(a.symbol, src, a.interval, res))


if __name__ == "__main__":
    sys.exit(main())
