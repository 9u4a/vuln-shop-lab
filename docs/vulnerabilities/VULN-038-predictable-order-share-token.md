# VULN-038 예측 가능한 주문 공유 토큰

- 대상 스택: node-express, java-spring
- 심각도: High
- 분류: A04:2025 Cryptographic Failures (CWE-330 Use of Insufficiently Random Values, CWE-340 Generation of Predictable Numbers/IDs)

## 위치

주문 공유 링크의 토큰이 `base64url(urlencode("oid=" + orderId))` 다 — 난수가 전혀 들어가지 않는다.
URL 인코딩을 한 번 더 씌워 겉보기만 복잡할 뿐, 스킴을 알면 임의 주문 번호로 유효 토큰을 만들 수 있고(위조)
역산도 된다(가역). 공유 조회 엔드포인트는 무인증이므로 토큰을 맞히기만 하면 어떤 주문이든 열람된다.

- node: `apps/node-express/src/share-token.js` — `orderShareToken(id) = Buffer.from(encodeURIComponent('oid=' + id)).toString('base64url')`.
  `orders.js`의 `GET /shared/:token` 은 `requireAuth` 없이 저장된 `share_token` 문자열 매칭으로 반환(디코드 안 함).
- java: `.../security/ShareTokens.java` — `of(id) = base64url( urlencode("oid=" + id) )`(패딩 없음).
  `OrderController.GET /api/orders/shared/{token}` 은 `currentUser` 게이트 없음.
- 인코딩 지점은 node `share-token.js`(+`db.js` 백필), java `ShareTokens`(+`DataSeeder` 백필) 한 곳으로 통일.

## 트리거 방법

```
# 토큰 = base64url(urlencode("oid="+id)).  "oid=1" → urlencode "oid%3D1" → base64url "b2lkJTNEMQ"
python3 - <<'PY'
import base64, urllib.parse
for i in [1,2,3,42]:
    s = urllib.parse.quote("oid="+str(i), safe="")
    t = base64.urlsafe_b64encode(s.encode()).decode().rstrip("=")
    print(i, t)
PY
for t in <위 토큰들>; do curl -s /api/{stack}/orders/shared/$t; done
→ 각 주문의 항목·결제금액·배송지·배송상태가 로그인 없이 반환됨(역산도 동일 방식으로 가능)
```

## 영향

- 주문 번호 1부터 순차 인코딩만으로 **전 주문**의 항목·금액·배송지(VULN-037과 같은 PII)를 열거.
- 토큰이 사용자에게 노출되므로(공유 링크 복사 UI) 한 건만 관찰해도 전체 스킴이 드러난다.
- 만료·폐기 개념이 없어 한 번 유출된 링크는 영구 유효.
- 저장소 최초의 **A04 Cryptographic Failures** 사례 — 그동안 비밀번호 해시(bcrypt)는 올바르게
  쓰였고 약한 토큰·예측 가능 식별자가 없었다.

## 증거 (재현 확인)

2026-09-01, 클린 재시드 후 로컬 재현(양 스택 동일, 구 스킴 `base64("1")=MQ==`): 주문 #1 전체 반환.
2026-09-02, 인코딩을 `base64url(urlencode("oid="+id))`로 강화한 뒤에도 성질 동일 — 스킴을 알면 토큰
`b2lkJTNEMQ`(=`oid=1`) 등으로 임의 주문 열람 가능(위조·역산 유지). Phase 2에서 `:8090` 재확인 예정.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 공유 토큰을 **CSPRNG 기반 128비트+ 랜덤**(`crypto.randomBytes(16).toString('base64url')` /
`SecureRandom`)으로 생성해 `orders.share_token` 에 저장하고 인덱스. 필요하면 만료·폐기(revoke)와
조회 시 최소 정보만 반환(PII 마스킹). 토큰은 추측·열거가 불가능해야 하며 주문 번호와 상관관계가 없어야 한다.

관련: [[VULN-037-shipment-tracking-idor]], [[VULN-006-session-fixation-no-lockout]], [[VULN-011-path-traversal-receipt-download]]
