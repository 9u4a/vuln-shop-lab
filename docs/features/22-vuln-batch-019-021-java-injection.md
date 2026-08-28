# 22. 취약점 배치: VULN-019 Java 커맨드 인젝션, VULN-020 XXE, VULN-021 Text4Shell

브랜치: `feature/vuln-batch-019-java-injection` · 관련 취약점: VULN-019, VULN-020, VULN-021

Java 전용. 배치 중 가장 무거움(신규 maven 의존성·셸 exec·신규 컨트롤러·`vuln/` 헬퍼).

## VULN-019 — Java 영수증 생성 OS 커맨드 인젝션
- `OrderController.generateReceipt()` — `Files.writeString` → `note`(없으면 `user.getBio()`)를 `echo "..." > file`에 결합해 `Runtime.exec({"sh","-c",cmd})`. VULN-010(node)의 정확한 짝.

## VULN-020 — XML 상품 임포트 XXE
- 신규 `CatalogImportController` — `POST /api/admin/products/import`(admin, `application/xml`). 무방비 `DocumentBuilderFactory`(doctype 차단·secure processing 없음). `<!ENTITY xxe SYSTEM "file:///...">`로 파일 읽기, 외부 DTD 변형으로 SSRF.

## VULN-021 — commons-text 1.9 (CVE-2022-42889, Text4Shell)
- `pom.xml`에 `commons-text:1.9` 명시(BOM 미관리 — 버전 스큐 방지). `vuln/TemplateRenderer`가 `StringSubstitutor` 보간을 격리.
- `FaqController.list()`/`NoticeController.list()`가 `answer`/`body`를 `render()`에 통과("공지 필드 치환" 기능). `${env:...}`/`${url:...}`/`${dns:...}` 룩업이 실동 벡터(`${script:...}` RCE는 JSR-223 엔진 부재로 불가).
