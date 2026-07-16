## Why
The current Upload page shows only a binary "Processing..." state and accepts any
file extension. For large log files users need progress visibility, must drop
files by dragging, and should get immediate feedback on unsupported formats
before a slow upload fails server-side.

## What Changes
- Frontend: drag-and-drop support on the dropzone (in addition to click-to-select).
- Frontend: client-side validation of file type (`.txt`/`.log`) and size
  (<=100MB) before uploading, with inline errors.
- Frontend: upload progress bar using axios `onUploadProgress`.
- Frontend: distinguish server validation errors (400 with message) from network
  errors and surface the server message when present.
- Backend (minor): return a count of imported lines in the upload success
  response so the UI can show "N logs imported".

## Impact
- `frontend/src/pages/Upload.tsx`
- `src/routes/upload.ts` (success payload)
- `openspec/specs/frontend/spec.md`, `openspec/specs/backend/spec.md`
