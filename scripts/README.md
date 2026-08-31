# 운영 스크립트 · 자주 쓰는 명령

## 스모크 테스트
기동 후 양 스택이 nginx(:8090)로 응답하는지 확인:
```
bash scripts/smoke.sh
```

## 자주 쓰는 docker compose 명령

```bash
# 전체 기동(빌드 포함). 헬스체크로 백엔드가 준비된 뒤 nginx/client가 뜬다
docker compose up --build -d

# 특정 서비스만 재빌드+재기동 (예: 백엔드 코드 수정 후)
docker compose up -d --build node-express
docker compose up -d --build java-spring
docker compose up -d --build nginx  # nginx.conf는 이미지에 COPY됨 — restart로는 옛 conf가 뜬다

# 클린 재시드 — DB 볼륨까지 삭제 후 새로 시드 (스키마·시드 변경 시)
docker compose down -v && docker compose up --build -d

# 로그 / 상태
docker compose logs -f node-express
docker compose ps
```

> 볼륨: `node_data`·`java_data`(DB), `*_uploads`(업로드), `mongo_data`. `down -v`는 이들을 전부 지운다.
