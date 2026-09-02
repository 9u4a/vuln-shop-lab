# 61. 내 Q&A + 답변·배송 알림

브랜치: `feature/giftcard-search-qna-notify` · 관련 취약점: —

## 무엇을 만들었나

- **내 Q&A**: 마이페이지 "내 Q&A" 탭(`/mypage/qna`). `GET /qna/mine`(로그인 사용자 본인 문의)으로 제목·
  답변여부(답변완료/답변대기 칩)·작성일을 표시, 클릭 시 상세로. node `qna.js`/java `QnaController`에
  `/mine` 추가(`QuestionRepository.findByUserIdOrderByIdDesc`), client `MyPageQna.jsx` + 탭/라우트.
- **Q&A 답변 알림**: 관리자가 답변(`PUT /qna/:id/answer`)을 등록하면 질문 작성자에게 알림 발송
  ("문의에 답변이 등록되었습니다", `/qna/:id`). 헤더 종 아이콘이 다음 페이지 접근 시 unread로 노출.
- **배송 알림**: 관리자 송장 등록/상태변경(`PUT /admin/orders/:id/shipment`)에서 상태가 `shipped`/`delivered`면
  주문자에게 "배송이 시작/완료되었습니다" 알림(`/orders/:id`). 구매완료(order.paid) 알림은 기존 유지.

## 설계 판단

- 기존 알림 인프라(`notify()` / `Notification`, NotificationBell의 페이지 접근 시 unread-count 재조회)를 그대로
  재사용하고 **발화 지점만 추가**했다. 별도 폴링/웹소켓 없이 다음 이동에서 자연스럽게 노출된다.
- Q&A "mine"은 목록 payload의 `answered`(answer 존재 여부)를 그대로 써 스키마 변경 없이 구현.

## 이후 변경

- 실시간성이 필요하면 SSE/폴링 도입 여지. 현재는 접근 시 갱신으로 충분.
