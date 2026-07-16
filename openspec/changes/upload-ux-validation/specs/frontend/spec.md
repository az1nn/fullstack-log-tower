## MODIFIED Requirements

### Requirement: Upload screen
The system SHALL send a selected `.txt`/`.log` file via multipart/form-data to `POST /api/logs/upload`, with drag-and-drop, client validation, progress feedback, and clear error/success states.

#### Scenario: Drag-and-drop and validate
- **WHEN** the user drags a file onto the dropzone or selects one
- **THEN** the file type and size are validated client-side before upload

#### Scenario: Progress and result
- **WHEN** a valid file uploads
- **THEN** a progress bar shows transfer and the success state shows the imported count
