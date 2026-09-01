# VULN-038 예측 가능한 주문 공유 토큰

- 대상 스택: node-express, java-spring
- 심각도: High
- 분류: A02:2021 Cryptographic Failures (CWE-330 Use of Insufficiently Random Values, CWE-340 Generation of Predictable Numbers/IDs)

## 위치

주문 공유 링크의 토큰이 `base64(String(orderId))` 다 — 난수가 전혀 들어가지 않는다.
디코드하면 주문 번호가 그대로 나오고(가역), 임의의 주문 번호를 인코딩하면 유효한 링크가 된다(위조).
공유 조회 엔드포인트는 무인증이므로 토큰을 맞히기만 하면 어떤 주문이든 열람된다.

- node: `apps/node-express/src/routes/orders.js` — `shareToken(orderId) = Buffer.from(String(orderId)).toString('base64')`,
  `GET /shared/:token` 은 `requireAuth` 없이 `share_token` 으로 주문·항목·배송을 반환.
- java: `.../controller/OrderController.java` — `shareToken(id) = Base64.getEncoder().encodeToString(String.valueOf(id).getBytes())`,
  `GET /api/orders/shared/{token}` 은 `currentUser` 게이트 없음.

## 트리거 방법

```
# 토큰 = base64(주문번호):  base64("1")="MQ==",  base64("2")="Mg==",  base64("42")="NDI="
for t in MQ== Mg== Mw== NDI=; do curl -s /api/{stack}/orders/shared/$t; done
→ 각 주문의 항목·결제금액·배송지·배송상태가 로그인 없이 반환됨

python3 -c "import base64; print(base64.b64decode('NDI='))"   # b'42' — 토큰을 그대로 되돌릴 수 있음
```

## 영향

- 주문 번호 1부터 순차 인코딩만으로 **전 주문**의 항목·금액·배송지(VULN-037과 같은 PII)를 열거.
- 토큰이 사용자에게 노출되므로(공유 링크 복사 UI) 한 건만 관찰해도 전체 스킴이 드러난다.
- 만료·폐기 개념이 없어 한 번 유출된 링크는 영구 유효.
- 저장소 최초의 **A02 Cryptographic Failures** 사례 — 그동안 비밀번호 해시(bcrypt)는 올바르게
  쓰였고 약한 토큰·예측 가능 식별자가 없었다.

## 증거 (재현 확인)

2026-09-01, 클린 재시드 후 로컬 재현(양 스택 동일): `GET /api/node/orders/shared/MQ==` (토큰 = base64("1"))
→ 주문 #1(user1 소유)의 항목·배송지·송장 전체 반환. 생성된 주문의 `shareToken` 도 `base64(id)` 로 확인.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 공유 토큰을 **CSPRNG 기반 128비트+ 랜덤**(`crypto.randomBytes(16).toString('base64url')` /
`SecureRandom`)으로 생성해 `orders.share_token` 에 저장하고 인덱스. 필요하면 만료·폐기(revoke)와
조회 시 최소 정보만 반환(PII 마스킹). 토큰은 추측·열거가 불가능해야 하며 주문 번호와 상관관계가 없어야 한다.

관련: [[VULN-037-shipment-tracking-idor]], [[VULN-006-session-fixation-no-lockout]], [[VULN-011-path-traversal-receipt-download]]
