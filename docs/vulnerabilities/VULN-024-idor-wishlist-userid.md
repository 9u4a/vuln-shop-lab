# VULN-024 위시리스트 조회 IDOR (userId 파라미터 신뢰)

- 대상 스택: node-express, java-spring
- 심각도: Medium
- 분류: A01:2021 Broken Access Control (IDOR, CWE-639)

## 위치

찜(좋아요) 기능의 위시리스트 조회 엔드포인트가 `userId` 쿼리 파라미터를 소유권 검증 없이 그대로
사용한다. 로그인만 되어 있으면 임의의 `userId`로 다른 사용자의 찜 목록을 조회할 수 있다.

- node: `apps/node-express/src/routes/likes.js`, `GET /api/likes`
  ```js
  const userId = req.query.userId || req.session.user.id; // 세션 사용자와 일치 검증 없음
  const rows = db.prepare(`SELECT p.* FROM product_likes l JOIN products p ...
                           WHERE l.user_id = ? ...`).all(userId);
  ```
- java: `apps/java-spring/.../controller/LikeController.java`, `GET /api/likes`
  ```java
  Long targetUserId = userId != null ? userId : user.getId(); // 소유권 검증 없음
  likeRepository.findByUserIdOrderByIdDesc(targetUserId);
  ```

## 트리거 방법

```
1) user1 로 로그인 (세션 쿠키 획득)
2) GET /api/likes?userId=4      → user2(id=4)의 찜 목록이 그대로 반환됨
```

임의의 `userId` 값을 순회하면 전체 사용자의 위시리스트를 열거할 수 있다.

## 영향

- 다른 사용자의 관심 상품(취향·구매 의도) 프로파일 노출 — 개인정보/행태정보 유출.
- 사용자 id를 1부터 순회하며 전 계정의 찜 목록을 수집하는 대량 열거 가능.

## 증거 (재현 확인)

2026-08-28, 클린 재시드 후 로컬 재현(양 스택 동일): user1 세션으로 `GET /api/likes?userId=4`
호출 시 user2의 찜 3건(실버 체인 목걸이, 레더 크로스백, 베이식 크루넥 티셔츠)이 응답됨.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: `userId` 파라미터를 신뢰하지 말고 항상 세션 사용자(`req.session.user.id` /
`session.getAttribute("user")`)의 것으로 고정. 관리자용 타인 조회가 필요하면 별도의 admin 전용
엔드포인트로 분리하고 `requireAdmin`으로 보호한다.
