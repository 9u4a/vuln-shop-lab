# Fix: Nginx host port collided with Burp Suite's default proxy listener

Branch: `fix/nginx-port-burp-conflict` (built on `main`, after PR #15 merged)

## Problem

The Nginx web-server tier added in the previous feature was published on host port `8080`. Burp Suite's default proxy listener is also `127.0.0.1:8080`. With both bound, browser traffic aimed at the app on `:8080` never actually reached Burp for interception — no proxy history, no logged traffic — because the port was ambiguous between "the app" and "the diagnosis tool."

## Fix

Moved Nginx's published port from `8080` to `8090` in `docker-compose.yml`. Updated `CLAUDE.md`'s "Run locally" section to note why `8080` is avoided.

## Verified

`docker compose up -d nginx` recreated the container on the new mapping. Confirmed via `docker compose ps` (Nginx now publishes only `8090:80`) and by comparing response headers on both ports: `:8090` returns the app (`Server: nginx/1.27.5`, real content), `:8080` returns a response with Burp's characteristic header set (`X-Frame-Options: DENY`, `Cache-control: no-cache, no-store`, `Pragma: no-cache`, no `Server` header) — confirming Burp Suite itself, not our app, owns that port now.
