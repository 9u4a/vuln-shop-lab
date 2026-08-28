# 09. 관리자 서브페이지 · 공지사항 · 403/404 · 상품 이미지

브랜치: `feature/admin-subpages-notices-images`

## 무엇을 만들었나
- 관리자 서브페이지: 단일 `/admin`을 `/admin/{settings,users,orders,products,faq,notices}`로 분리(`AdminLayout` 탭 + `<Outlet/>`), 각 탭이 자기 데이터만 조회.
- 공지사항: FAQ와 동일 구조 — `notices` 테이블, `GET /api/notices`(공개), 쓰기 관리자 전용, `/notices` + `/admin/notices`.
- 403/404: `NotFound`·`Forbidden`(3초 후 `/`로), `RequireAuth`(→`/login`)·`RequireRole`(→`/forbidden`) 가드, `SessionContext.loading`으로 플래시 리다이렉트 방지.
- 상품 이미지 업로드: `POST /api/admin/products/:id/image`(양 스택). node는 multer 설정을 `src/uploads.js`로, java는 `storage.Uploads` 헬퍼로 공용화. `Products`·`ProductDetail`이 실제 `<img>` 렌더.
- node `GET /api/products`가 `toProduct()`로 camelCase 매핑(java Jackson 출력과 일치). SQLi(VULN-001)는 응답 변환일 뿐이라 영향 없음.

## 이후 변경
- 공지 이미지 업로드는 URL 필드 → 파일 업로드로 전환, 목록/상세 분리(31). 업로드 헬퍼는 Content-Type 신뢰 취약점(VULN-018)의 공용 표면이 됨.
