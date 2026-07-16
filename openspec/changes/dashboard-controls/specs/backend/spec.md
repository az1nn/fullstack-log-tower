## MODIFIED Requirements

### Requirement: Aggregate dashboard metrics
The system SHALL expose total count, level distribution, daily volume trend, and per-level daily trend.

#### Scenario: Metrics with per-level trend
- **WHEN** a client GETs `/api/metrics` with optional `startDate`/`endDate`
- **THEN** the response includes `summary.total`, `distribution`, `trends` (aggregate daily), and `trendsByLevel` (daily counts pivoted by level: INFO/WARN/ERROR/DEBUG/FATAL)

## ADDED Requirements

### Requirement: Dashboard date-range and refresh controls
The system SHALL let users change the dashboard date range (presets + custom) and refresh data manually or automatically.

#### Scenario: Change range
- **WHEN** the user picks a preset or custom date range
- **THEN** the dashboard refetches `/api/metrics` for that window

#### Scenario: Auto-refresh
- **WHEN** the user enables auto-refresh
- **THEN** the dashboard refetches every 30s until disabled or unmounted

### Requirement: Per-level trend visualization
The system SHALL render the daily volume trend as one line per severity level.

#### Scenario: Multi-line trend
- **WHEN** the dashboard trend chart renders
- **THEN** each severity level is shown as a distinct colored line using the level color map
