# 34. 안정성·편의성 개선 (삭제 확인 · 이미지 폴백 · 재고 경고 · Node 크래시 방지)

브랜치: `feature/ux-and-node-safety`

문서 정리 후 진행한 안정성/편의성 보강. 사용자가 범위를 **클라이언트 편의성**과 **Node 비동기
에러 안전 래퍼**로 좁혔다. 의도된 취약점은 전부 보존한다(아래 "취약점 보존" 참고).

## 무엇을 만들었나

- **버그 수정 — 홈 이벤트 팝업 이미지**: `components/EventPopups.jsx`가 `uploadsBase` 접두어 없이
  원본 파일명을 `src`로 써서 이미지 있는 팝업이 깨지던 것을 `${backend.uploadsBase}/${imageUrl}`로 수정.
- **삭제 확인 모달**: `components/ConfirmDialog.jsx` 신설(기존 `.modal*` 재사용, 오버레이 클릭·Esc로
  취소). 클릭 즉시 삭제되던 7곳에 적용 — 관리자(상품/쿠폰/이벤트/FAQ/공지), 사용자(리뷰/Q&A).
  "삭제 대상을 state에 담고 확인 시 실제 삭제" 패턴으로 통일. 네이티브 `confirm`은 쓰지 않음(리디자인 정책).
- **이미지 깨짐 폴백 일원화**: `components/SafeImage.jsx` 신설(로드 실패 시 `.image-ph` 자리표시).
  폴백 없던 `<img>`에 적용 — NoticeDetail·EventDetail·Events·EventPopups·MyPageProfile(아바타)·
  AdminProducts(썸네일)·AdminImageField. (ProductCard/ProductDetail은 기존 폴백 유지.)
- **장바구니 재고 초과 경고**: `CartContext.addItem`이 라인에 `stock`을 저장, `Cart.jsx`가 수량 >
  재고면 "재고 N개 남음" 경고 표시. 안내만 하고 제출은 막지 않는다(아래 보존 참고).
- **Node 비동기 에러 안전 래퍼**: `express-async-errors`를 추가하고 `server.js` 상단에서 require —
  async 라우트의 rejection이 Express 기본(dev) 에러 핸들러로 전달돼, 순간적 DB/Mongo 오류가
  프로세스를 죽이거나 요청을 무한 대기시키지 않고 500으로 종결된다. `process.on('unhandledRejection'|
  'uncaughtException')` 로깅으로 라우트 밖 오류에서도 프로세스 유지.

## 취약점 보존 (의도적으로 건드리지 않음)

- **VULN-007**: 커스텀 에러 미들웨어를 **추가하지 않아** dev 기본 핸들러의 스택트레이스 노출이
  그대로 유지된다(검증에서 재확인).
- 서버측 수량/옵션 미검증(VULN-015/027)은 그대로 — 재고 경고는 순수 클라이언트 안내라 API 재현
  경로를 막지 않는다.
- `dangerouslySetInnerHTML`(VULN-008/017/023/028), 비밀글 마스킹, `?userId=` IDOR 등은 코드 미변경.

## 검증

- `node -c src/server.js` OK, 컨테이너 내 `express-async-errors` 로드 확인, client `npm run build` OK.
- 재빌드·기동 후: 정상 엔드포인트 200, **VULN-007 재확인**(잘못된 JSON POST → 응답 본문에 스택트레이스
  포함), 오류 후 node 컨테이너 생존 확인.
- 브라우저(육안): 이벤트 팝업 이미지 표시, 삭제 시 확인 모달(취소=미삭제/확인=삭제), 깨진 이미지
  자리표시, 재고 초과 경고(주문 자체는 여전히 가능).

## 이후 후보 (미착수)

클라이언트 에러 배너·전역 ErrorBoundary·쓰기 버튼 중복 제출 방지, 인프라(compose 헬스체크·restart,
Mongo 재연결, `Event.active`·`LoginLog.success` `@ColumnDefault`, nginx gzip·캐싱), 개발 스크립트.
