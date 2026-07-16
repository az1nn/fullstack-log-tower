## MODIFIED Requirements

### Requirement: Log explorer with search
The system SHALL list logs in a paginated table with text search, multi-level, service, and date-range filters from `GET /api/logs`.

#### Scenario: Apply filters
- **WHEN** the user toggles severity chips, types a service, or picks a date range
- **THEN** the page refetches `/api/logs` with the new filters (resetting page to 1) and shows an active-filter indicator
