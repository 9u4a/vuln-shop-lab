# 55. 회원 등급/멤버십

브랜치: `feature/ux-completeness` · 관련 취약점: [VULN-045](../vulnerabilities/VULN-045-membership-tier-mass-assignment.md)

## 무엇을 만들었나

- **회원 등급**(basic/silver/gold/vip)과 등급별 정률 할인(0/3/5/10%). 관리자 "사용자" 상세에서 등급 지정,
  헤더에 등급 뱃지(비-basic) 표시, 체크아웃 시 등급 할인 자동 적용.
- 서버: `users.membership_tier` 컬럼(role과 별개 축) + `Tiers` 상수. 관리자 지정 `PUT /api/admin/users/:id/tier`.
  주문 생성 시 `itemsTotal * 등급률`을 할인에 합산. 양 스택 동일.

## 설계 판단

- role(권한)과 무관한 **구매 등급**이 없었다. role 변경 UI/엔드포인트(AdminUsers·`/role`)를 미러해 관리자
  전용 등급 지정 경로를 별도로 두었다. 등급은 세션(`membershipTier`)에도 실어 헤더 뱃지·재계산에 쓴다.
- 정상 경로(관리자 지정)는 검증돼 있으나, 일반 프로필 수정이 `membership_tier`를 걸러내지 않아 자가 승급이
  가능하다(VULN-045).

## 이후 변경

- 정상화 시: 프로필 수정 화이트리스트에서 `membership_tier`/`membershipTier`를 제외(등급은 관리자 전용
  엔드포인트로만 변경). 등급 산정은 서버 측 구매 실적 기준으로 자동화.
