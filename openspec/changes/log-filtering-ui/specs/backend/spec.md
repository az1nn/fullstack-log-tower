## ADDED Requirements

### Requirement: Advanced log filtering
The system SHALL let users filter logs by severity (multi-select), service, and date range in addition to text search.

#### Scenario: Multi-level and service filter
- **WHEN** a client GETs `/api/logs` with `levels=ERROR&levels=WARN` and `service=auth`
- **THEN** only logs whose level is in the set and whose service contains "auth" (case-insensitive) are returned

#### Scenario: Date range filter
- **WHEN** a client GETs `/api/logs` with `startDate` and `endDate` ISO datetimes
- **THEN** only logs within the inclusive time window are returned

## MODIFIED Requirements

### Requirement: List and filter logs
The system SHALL return paginated logs with optional level, multi-level, service, text search, and date-range filters.

#### Scenario: Filtered, paginated query
- **WHEN** a client GETs `/api/logs` with `page`, `perPage`, `level`, `levels`, `service`, `search`, `startDate`, `endDate`
- **THEN** the service returns `data` and `meta` ordered by timestamp desc, honoring all provided filters
