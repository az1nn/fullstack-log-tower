# Tasks: Mock log generator

- [ ] Create `src/lib/mockLogs.ts` with `generateMockLogs({ count, days, service }): string`
      producing lines in `[timestamp] [LEVEL] message (service=name)` format.
- [ ] Add a "Generate mock logs" button to `frontend/src/pages/Upload.tsx`.
- [ ] Add an inline modal with controls: count (1–100), days (1–30), service (optional).
- [ ] On generate: build the text, download it as `mock-logs.log` via Blob +
      object URL, then revoke the URL.
- [ ] Show a brief confirmation after download; no auto-upload.
- [ ] Add a unit test for `generateMockLogs` (count respected, format parses,
      levels valid, optional service appended) in `src/lib/mockLogs.test.ts`.
- [ ] Update `openspec/specs/frontend/spec.md` (Upload screen requirement) to
      include the generator, and add a delta spec under the change.
- [ ] Run `npx tsc --noEmit` and `npx vitest run` in `frontend/`; both green.
- [ ] Commit (spec commit first) and push.
