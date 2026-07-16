# Design: Mock log generator

## UI
- New **"Generate mock logs"** button in `Upload.tsx` (secondary style, e.g.
  `bg-zinc-100`), placed near the upload dropzone.
- Clicking it toggles a **modal** rendered inline in the page (no shared
  `components/` dir exists yet; inline modal is consistent with current inline
  primitives). Modal overlay: fixed inset-0 bg-black/40, centered card
  `bg-white rounded-xl shadow-sm border border-zinc-200 p-6`.

## Controls (state)
- `count` (number, 1–100, default 10) — range input + number display.
- `days` (number, 1–30, default 1) — how far back timestamps spread.
- `service` (string, optional, default empty → rotating among
  `web|api|db|auth`).
- `levelBias` optional — keep simple: uniform random among the 5 levels.

## Generation (pure function)
`generateMockLogs({ count, days, service }): string`
- For each line: pick a random `level` from `INFO, WARN, ERROR, DEBUG, FATAL`;
  a timestamp spread uniformly within the last `days` days, formatted
  ISO-ish but accepted by `new Date()` (use `toISOString()`); a message from a
  small pool (e.g. "Request completed", "Cache miss", "DB connection slow",
  "User login", "Timeout", "500 from upstream"); append
  ` (service=<name>)` when a service is set.
- Line format exactly: `[<timestamp>] [<LEVEL>] <message>( (service=<name>)?)`.
- Join with `\n`, return the full text.

## Download
- Build `new Blob([text], { type: 'text/plain' })`, `URL.createObjectURL`,
  create an `<a download="mock-logs.log">`, click, revoke URL.
- After download, show a small inline confirmation (no auto-upload — user
  decides to import the generated file via the existing dropzone).

## Conventions
- Tailwind zinc/emerald/red palette matching Upload.tsx.
- No new deps; `lucide-react` icons (e.g. `FilePlus`, `Download`, `X`).
- Strict TS: no unused vars; type the generator props.
