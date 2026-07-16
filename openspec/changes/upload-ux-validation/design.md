## Approach
- Backend: in `upload.ts`, count inserted rows (`logsToInsert` total) and return
  `{ message, imported: number }` on success (200/201). Keep the 400 contract.
- Frontend: lift the dropzone into a controlled component handling both
  `onDrop`/`onDragOver` and the file input. Validate extension and size
  (100MB) before calling `api.post`, aborting with an inline error otherwise.
- Frontend: pass `onUploadProgress` to axios to compute `%` and render a
  progress bar; keep `isUploading` until completion.
- Frontend: on error, read `error.response.data.message` (or `errors`) when
  available and show it; fall back to a generic message.

## Key Decisions
- Progress bar reflects upload transfer only (backend streaming parse is fast);
  acceptable for UX.
- Size limit mirrors the backend 100MB multipart limit.

## Risks
- Drag-and-drop needs `preventDefault` on dragover to avoid browser opening the file.
