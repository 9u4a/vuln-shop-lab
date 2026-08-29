#!/usr/bin/env bash
# 기동 후 양 스택(node/java)이 nginx(:8090)를 통해 실제로 응답하는지 빠르게 확인.
# 사용: bash scripts/smoke.sh   (Git Bash / WSL / Linux)
set -u
BASE="${BASE:-http://localhost:8090}"
fail=0

check() {
  local name="$1" url="$2" expect="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  if [ "$code" = "$expect" ]; then
    printf "  OK   %-28s %s\n" "$name" "$code"
  else
    printf "  FAIL %-28s got %s (expected %s)\n" "$name" "$code" "$expect"
    fail=1
  fi
}

echo "== 웹 진입점 =="
check "home (SPA)"        "$BASE/"                          200

for stack in node java; do
  echo "== $stack 백엔드 =="
  check "$stack products"  "$BASE/api/$stack/products"       200
  check "$stack faqs"      "$BASE/api/$stack/faqs"           200
  check "$stack notices"   "$BASE/api/$stack/notices"        200
  check "$stack events"    "$BASE/api/$stack/events"         200
  check "$stack qna"       "$BASE/api/$stack/qna"            200
  check "$stack addresses" "$BASE/api/$stack/addresses?q=%EC%84%9C%EC%9A%B8" 200
done

echo "== node 전용 (Mongo 활동 피드) =="
check "node activity(401)" "$BASE/api/node/activity"         401

echo
if [ "$fail" = "0" ]; then
  echo "SMOKE PASS"
else
  echo "SMOKE FAIL"
  exit 1
fi
