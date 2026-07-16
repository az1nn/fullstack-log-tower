## MODIFIED Requirements

### Requirement: Dashboard visualization
The system SHALL show total logs, a daily volume line chart (per severity), a severity distribution pie chart, date-range controls, and refresh from `GET /api/metrics`.

#### Scenario: Dashboard with controls
- **WHEN** the user opens `/` and changes the date range or enables auto-refresh
- **THEN** the page refetches `/api/metrics` for the selected window and updates all charts
