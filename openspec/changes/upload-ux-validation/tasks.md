## 1. Backend: import count in response
- [ ] Track total inserted rows across batches in `upload.ts`.
- [ ] Return `{ message: string, imported: number }` on success.

## 2. Frontend: drag-and-drop + validation
- [ ] Add `onDragOver`/`onDrop` handlers to the dropzone; prevent default browser behavior.
- [ ] Validate extension (`.txt`/`.log`) and size (<=100MB); show inline error and block upload if invalid.

## 3. Frontend: progress + error states
- [ ] Pass `onUploadProgress` to `api.post` and render a progress bar (%).
- [ ] On error, surface `error.response.data.message`/`errors` when present; generic fallback otherwise.
- [ ] On success, show "N logs imported" using the `imported` field.

## 4. Specs
- [ ] Update `openspec/specs/backend/spec.md` upload requirement with `imported` count.
- [ ] Update `openspec/specs/frontend/spec.md` upload requirement with DnD, validation, progress.
