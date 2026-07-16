## MODIFIED Requirements

### Requirement: Ingest log files via upload
The system SHALL accept multipart file uploads, ingest parsed log lines in batches, and report the number of imported logs.

#### Scenario: Successful upload
- **WHEN** a client POSTs a valid `.txt`/`.log` file to `/api/logs/upload`
- **THEN** parsed lines are inserted in batches of 1000 and the service returns 201 with `{ message, imported: number }`

## ADDED Requirements

### Requirement: Upload UX and client validation
The system SHALL support drag-and-drop, validate file type/size before upload, show transfer progress, and surface server error messages.

#### Scenario: Invalid file blocked
- **WHEN** the user selects a non-`.txt`/`.log` file or a file >100MB
- **THEN** an inline error is shown and the upload is not started

#### Scenario: Progress and result
- **WHEN** the user uploads a valid file
- **THEN** a progress bar reflects transfer and, on success, the UI shows the imported count from the server response

#### Scenario: Server error surfaced
- **WHEN** the server responds with an error (e.g. 400 validation)
- **THEN** the server's message is displayed to the user
