#!/usr/bin/env python3
"""Gemini로 유튜브 영상을 찾고 요약한다 (파이썬 표준 라이브러리만 사용).

Gemini는 유튜브 영상의 말뿐 아니라 화면(유튜버가 띄운 차트, 자막 이미지)까지 본다.
vidIQ 같은 도구가 자막과 조회수·트렌드를 맡고, 이 스크립트는 영상 속 차트 화면까지 읽어야 할 때 쓴다.

사용 예:
  python3 yt_gemini.py search "비트코인 시황 볼린저 밴드" --days 3
  python3 yt_gemini.py watch https://www.youtube.com/watch?v=XXXXXXXXXXX
  python3 yt_gemini.py watch <URL> --prompt "영상에 나온 지지·저항 가격만 정리해줘"
  python3 yt_gemini.py models                      # 쓸 수 있는 모델 목록

API 키: 환경 변수 GEMINI_API_KEY. Claude Code 클라우드 환경처럼 프록시가 키를 넣어 주는 곳에서는
키 없이 실행해도 된다 (자리표시 값을 보내면 프록시가 실제 키로 바꾼다).
모델: --model 또는 환경 변수 GEMINI_MODEL (기본 gemini-3.5-flash-lite, 무료 등급에서 확인한 모델).
search 는 구글 검색 기능을 쓰는데 무료 등급에서는 사용량이 0이라 QUOTA_EXCEEDED 가 난다. 그때는 vidIQ로 영상을 찾는다.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")

WATCH_PROMPT = """이 유튜브 영상을 한국어로 정리해줘. 블로그 시황 글의 참고 자료로 쓴다.
1. 영상 한 줄 요약
2. 핵심 주장 3~5개 (영상에서 말한 시점 mm:ss 포함)
3. 화면에 나온 차트 정보: 종목·시간봉, 보조지표(특히 볼린저 밴드), 지지·저항 가격, 표시한 추세선. 말로 안 하고 화면에만 나온 것도 적는다.
4. 언급한 테마·뉴스·글로벌 이슈 (금리, 환율, 달러, 미국 지수, ETF 등)
5. 유튜버의 전망과 그 조건
영상에 없는 내용은 지어내지 말고, 숫자는 영상에 나온 그대로 쓴다. 불확실하면 (불확실)이라고 표시한다."""

SEARCH_PROMPT = """유튜브에서 "{query}" 관련 영상 중 최근 {days}일 안에 올라온 것을 찾아줘.
조회수나 채널 규모가 있는 영상을 우선해서 최대 {n}개.
각 영상마다: 제목, 채널, 올린 날짜, youtube.com 링크, 핵심 내용 한두 줄.
찾지 못한 정보는 비워 두고 지어내지 마."""


def _key():
    return os.environ.get("GEMINI_API_KEY") or "proxy-injected"


def _call(method, path, body=None, timeout=180):
    req = urllib.request.Request(
        f"{API}/{path}",
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        method=method,
        headers={"Content-Type": "application/json", "x-goog-api-key": _key()},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:500]
        if e.code in (401, 403) or "API_KEY_INVALID" in detail or "API key" in detail:
            sys.exit(f"AUTH_ERROR: Gemini API 키가 없거나 거부됐습니다 (HTTP {e.code}). {detail}")
        if e.code == 429:
            sys.exit("QUOTA_EXCEEDED: Gemini 사용량 한도를 넘었습니다 (무료 등급은 search 기능을 쓸 수 없음). "
                     "영상 찾기는 vidIQ로 하고, 잠시 뒤 다시 시도하세요.")
        if e.code in (500, 503):
            sys.exit(f"BUSY: Gemini 서버가 바쁩니다 (HTTP {e.code}). 잠시 뒤 다시 시도하거나 --model 을 바꾸세요.")
        sys.exit(f"API_ERROR: HTTP {e.code} {detail}")
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        sys.exit(
            f"NETWORK_BLOCKED: generativelanguage.googleapis.com 에 접속하지 못했습니다 ({e}). "
            "네트워크 허용 목록에 이 주소를 추가해야 합니다."
        )


def _text(resp):
    parts = []
    for c in resp.get("candidates", []):
        for p in c.get("content", {}).get("parts", []):
            if "text" in p:
                parts.append(p["text"])
    if not parts:
        reason = (resp.get("candidates") or [{}])[0].get("finishReason") or resp.get("promptFeedback")
        sys.exit(f"EMPTY_RESPONSE: Gemini가 답을 주지 않았습니다 ({reason}).")
    return "\n".join(parts).strip()


def _sources(resp):
    out = []
    for c in resp.get("candidates", []):
        for ch in (c.get("groundingMetadata") or {}).get("groundingChunks", []):
            w = ch.get("web") or {}
            if w.get("uri"):
                out.append({"title": w.get("title", ""), "uri": w["uri"]})
    return out


def cmd_watch(a):
    body = {
        "contents": [{
            "role": "user",
            "parts": [
                {"file_data": {"file_uri": a.url, "mime_type": "video/*"}},
                {"text": a.prompt or WATCH_PROMPT},
            ],
        }],
        "generationConfig": {"temperature": 0.2},
    }
    resp = _call("POST", f"models/{a.model}:generateContent", body)
    return {"url": a.url, "model": a.model, "summary": _text(resp)}


def cmd_search(a):
    body = {
        "contents": [{"role": "user", "parts": [{"text": SEARCH_PROMPT.format(query=a.query, days=a.days, n=a.n)}]}],
        "tools": [{"google_search": {}}],
        "generationConfig": {"temperature": 0.2},
    }
    resp = _call("POST", f"models/{a.model}:generateContent", body)
    return {"query": a.query, "model": a.model, "result": _text(resp), "sources": _sources(resp)}


def cmd_models(a):
    resp = _call("GET", "models?pageSize=200")
    names = [m["name"].split("/", 1)[-1] for m in resp.get("models", [])
             if "generateContent" in m.get("supportedGenerationMethods", [])]
    return {"models": names}


def main():
    p = argparse.ArgumentParser(description="Gemini 유튜브 검색·요약")
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--json", action="store_true", help="JSON으로 출력")
    sub = p.add_subparsers(dest="cmd", required=True)

    w = sub.add_parser("watch", help="유튜브 영상 하나를 보고 요약")
    w.add_argument("url")
    w.add_argument("--prompt", help="기본 요약 지시 대신 쓸 질문")
    w.set_defaults(func=cmd_watch)

    s = sub.add_parser("search", help="주제로 최근 유튜브 영상 찾기 (구글 검색 기반)")
    s.add_argument("query")
    s.add_argument("--days", type=int, default=7)
    s.add_argument("-n", type=int, default=5)
    s.set_defaults(func=cmd_search)

    m = sub.add_parser("models", help="쓸 수 있는 모델 목록")
    m.set_defaults(func=cmd_models)

    a = p.parse_args()
    out = a.func(a)
    if a.json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return
    if a.cmd == "models":
        print("\n".join(out["models"]))
    elif a.cmd == "watch":
        print(f"## 영상 요약 ({out['model']})\n{out['url']}\n\n{out['summary']}")
    else:
        print(f"## 유튜브 검색: {out['query']} ({out['model']})\n\n{out['result']}")
        if out["sources"]:
            print("\n### 검색 근거 링크")
            for s_ in out["sources"]:
                print(f"- {s_['title']}: {s_['uri']}")


if __name__ == "__main__":
    main()
