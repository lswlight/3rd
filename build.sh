#!/usr/bin/env bash
# claude.ai 업로드용 스킬 zip 생성 → dist/naver-blog-writer.zip
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/naver-blog-writer.zip
(cd skills && zip -rq ../dist/naver-blog-writer.zip naver-blog-writer -x '*.DS_Store' '*/__pycache__/*')
echo "built dist/naver-blog-writer.zip"
