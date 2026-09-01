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

echo "== 주문 라이프사이클 (기능 44~47) =="
for stack in node java; do
  check "$stack cart(401)"   "$BASE/api/$stack/cart"                         401
  check "$stack track(400)"  "$BASE/api/$stack/shipments/track"              400
  check "$stack track hit"   "$BASE/api/$stack/shipments/track?no=1000000001" 200
  check "$stack shared hit"  "$BASE/api/$stack/orders/shared/MQ=="           200
  check "$stack cart/share(401)" "$BASE/api/$stack/cart/share"               401
done

echo "== API 문서 (의도적 노출, VULN-034) =="
check "api-docs index"     "$BASE/api-docs"                            200
check "node swagger ui"    "$BASE/api-docs/node/"                      200
check "node openapi.json"  "$BASE/api-docs/node/openapi.json"          200
check "java swagger ui"    "$BASE/api-docs/java/swagger-ui/index.html" 200
check "java openapi"       "$BASE/api-docs/java/v3/api-docs"           200

echo
if [ "$fail" = "0" ]; then
  echo "SMOKE PASS"
else
  echo "SMOKE FAIL"
  exit 1
fi
