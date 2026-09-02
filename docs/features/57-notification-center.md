# 57. 인앱 알림센터

브랜치: `feature/ux-completeness` · 관련 취약점: [VULN-046](../vulnerabilities/VULN-046-notification-stored-xss.md)

## 무엇을 만들었나

- 헤더 **종 아이콘**에 미확인 뱃지 + 드롭다운으로 인앱 알림 확인/읽음. 주문 접수·결제 완료·쿠폰 발급 시
  자동 알림, 관리자 "설정"에서 **전체 알림 발송**(브로드캐스트).
- 서버: `GET /api/notifications`, `/unread-count`, `POST /:id/read`, `/read-all`, 관리자 `/broadcast`.
  신규 `notifications` 테이블/엔티티(user_id, type, title, body, link, read_at). 주문/쿠폰 플로우에 발신 훅 추가.
  양 스택 동일.

## 설계 판단

- 재입고 알림(RestockSubscription)의 `notified` boolean 외에 통합 알림 저장소가 없었다. 범용
  `notifications`를 신설하고, 이미 존재하던 이벤트 지점(주문 생성/확정, 쿠폰 claim)에 발신 훅을 얹었다.
- 관리자 브로드캐스트 `body`를 종 드롭다운에서 `dangerouslySetInnerHTML`로 렌더해 저장형 XSS를 남겼다
  (VULN-046, 관리자→사용자).

## 이후 변경

- 정상화 시: 알림 본문을 텍스트로 렌더(이스케이프)하거나 허용 태그만 sanitize, 링크는 내부 경로로 제한.
- 재입고 notify도 인앱 알림으로 통합하는 것은 후속 과제로 남김.
