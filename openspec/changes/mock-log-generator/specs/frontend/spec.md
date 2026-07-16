## ADDED Requirements

### Requirement: Mock log generator on Upload screen
The system SHALL let users generate a downloadable mock `.log`/`.txt` file
directly from the Upload screen, in the exact format accepted by the upload
parser, with no backend call.

#### Scenario: Open generator modal
- **WHEN** the user clicks "Generate mock logs" on the Upload screen
- **THEN** a modal opens with options for count (1–100), days (1–30), and an optional service name

#### Scenario: Generate and download
- **WHEN** the user sets options and confirms
- **THEN** the system builds `count` lines in `[timestamp] [LEVEL] message (service=name)` format and downloads them as `mock-logs.log`
- **AND** the generated file requires no backend request

#### Scenario: Format validity
- **WHEN** the generated file is later uploaded via the dropzone
- **THEN** every line is parsed by the existing upload parser (levels from `INFO, WARN, ERROR, DEBUG, FATAL`; optional `service=` suffix)
