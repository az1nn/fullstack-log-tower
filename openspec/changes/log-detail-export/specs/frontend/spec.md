## ADDED Requirements

### Requirement: Log detail view
The system SHALL let users expand a log row to view the full, untruncated message along with timestamp, level, and service.

#### Scenario: Open detail
- **WHEN** the user clicks a log row
- **THEN** a detail panel shows the full message and metadata, with the active search term highlighted

### Requirement: Export filtered results
The system SHALL let users export the current or all filtered logs as CSV or JSON.

#### Scenario: Export current page
- **WHEN** the user clicks "Export CSV" or "Export JSON"
- **THEN** the currently loaded logs download as a file

#### Scenario: Export all filtered
- **WHEN** the user clicks "Export all (filtered)"
- **THEN** all rows matching the active filters download (capped at 10k rows, noted in filename if truncated)
