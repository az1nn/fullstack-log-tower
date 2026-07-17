# Tasks: Full-stack containerization

- [ ] Create `frontend/Dockerfile` (multi-stage Vite build → nginx:alpine).
- [ ] Create `frontend/nginx.conf` (SPA fallback + `/api` proxy to backend).
- [ ] Rewrite root `docker-compose.yml` with `db` + `backend` + `frontend`
      services, shared network, backend `DATABASE_URL` → `db` hostname, healthchecks.
- [ ] Ensure the SPA uses relative `/api` calls (no hardcoded localhost in compose).
      Verify `frontend/src/lib/axios.ts` baseURL default works behind the proxy.
- [ ] Update `README.md` with an English section + one-command quick start
      (`docker compose up --build` → http://localhost:8080).
- [ ] Keep `docker-compose.test.yml` and `render.yaml` untouched.
- [ ] Verify locally if Docker is available; otherwise document and confirm
      config validity by inspection.
- [ ] Update main specs (infra) to reflect full-stack compose; add delta spec.
- [ ] Commit (spec first) and push.
