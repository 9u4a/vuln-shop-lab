# 41. 추천인 코드

브랜치: `feature/commerce-rewards-batch` · 관련 취약점: [VULN-032](../vulnerabilities/VULN-032-referral-reward-abuse.md)

## 무엇을 만들었나

- `users.referral_code`(가입 시 `REF<USERNAME>` 생성) + `users.referred_by`. 가입폼에 추천 코드
  입력(유효 시 추천인·신규 각 1,000P 적립). 마이페이지 "포인트·추천" 탭에서 내 코드 노출 + 사후 적용.
- 신규 API: `GET /api/referral`(내 코드/추천 수), `POST /api/referral/apply`(코드 적용, 리워드),
  `GET /api/admin/referrals`(관리자 — 사용자별 추천 코드/피추천인/추천 수/포인트 내역).
- 관리자 "추천인" 탭(`AdminReferrals.jsx`)에서 전체 추천 관계·리워드 현황 조회.
- 시드: 모든 사용자에 `REF<USERNAME>` 코드 backfill(양 스택 동일).

## 설계 판단

- 리워드는 feature 39 포인트로 지급(별도 리워드 테이블 없이 원장에 기록).
- 코드는 사람이 공유하기 쉽게 사용자명 기반 결정적 생성(`REFUSER1` 등). 시연·재현 편의.

## 이후 변경

- VULN-032를 의도적으로 남김: `apply`가 멱등성·자기참조·유효성 미검증 → 무한 적립. feature 39 선행 필요.
