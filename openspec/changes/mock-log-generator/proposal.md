# Proposal: Mock log generator on the Upload screen

## Why
Users need a quick way to produce sample `.txt`/`.log` files to exercise the
upload pipeline without sourcing real logs. The backend already parses lines of
the form `[timestamp] [LEVEL] message (service=name)`; we can generate
conforming files entirely on the client.

## What changes
- Add a **"Generate mock logs"** button to the Upload screen (`frontend/src/pages/Upload.tsx`).
- Clicking it opens a **modal** with options to generate **1–100** mock logs:
  - a count slider/input (1–100, default 10),
  - optional number of days to spread timestamps across (default 1),
  - optional service name (defaults to `web`, `api`, `db`, `auth` rotating),
  - level distribution among `INFO, WARN, ERROR, DEBUG, FATAL`.
- The generator builds lines matching the upload parser format and triggers a
  **file download** as `mock-logs.log` (`.log`/`.txt`, no backend call).
- No new dependencies: use native `Blob` + `URL.createObjectURL` for the
  download and `lucide-react` for modal/icons.

## Impact
- Purely frontend; frontend spec updated. Backend unchanged (existing upload
  parser already accepts the generated format).
- No new routes, no new env vars.
