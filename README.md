# Vuln Shop Security Lab

취약 웹 애플리케이션 개발 → 진단 → 조치 → 관제/대응 인프라 구축까지 이어지는 보안 학습용 프로젝트.

## 구성

| 경로 | 설명 |
| --- | --- |
| `apps/client/` | 공용 프런트엔드 — React + Vite |
| `apps/node-express/` | 백엔드 API — Node.js + Express |
| `apps/java-spring/` | 동일 시나리오 백엔드 API — Java + Spring Boot |
| `infra/` | 관제(Wazuh/ELK) 인프라 *(예정)* |
| `docs/` | 취약점 명세 · 진단 결과 · 탐지 규칙 *(로컬 전용, git 미포함)* |

## 빠른 시작

```
copy .env.example .env
docker compose up --build
```

- Client: http://localhost:5173 (홈 화면에서 대상 백엔드 전환)
- Node/Express API: http://localhost:3000
- Java/Spring API: http://localhost:8081

## 안전 사용 원칙

- 로컬/격리된 네트워크에서만 구동합니다. 인터넷에 노출하지 마세요.
- 모든 계정/데이터는 더미 데이터입니다.
- 취약점은 이 저장소 안에서 의도적으로, 통제된 목적(보안 학습)으로만 만들고 다룹니다.
