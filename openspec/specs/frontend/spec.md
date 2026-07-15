## Purpose
Provide the React SPA that lets users view the dashboard, explore/filter logs, and upload log files through a clean sidebar layout.

## Requirements

### Requirement: Sidebar layout with navigation
The system SHALL render an `AppLayout` with sidebar links to Dashboard, Logs, and Upload.

#### Scenario: App shell
- **WHEN** any route under `/` is rendered
- **THEN** the sidebar and header wrap the active page via `<Outlet />`

### Requirement: Dashboard visualization
The system SHALL show total logs, a daily volume line chart, and a severity distribution pie chart from `GET /api/metrics`.

#### Scenario: Dashboard load
- **WHEN** the user opens `/`
- **THEN** the page fetches `/api/metrics` and renders the total card, line chart, and pie chart

### Requirement: Log explorer with search
The system SHALL list logs in a paginated table with text search and level badges from `GET /api/logs`.

#### Scenario: Search and paginate
- **WHEN** the user types in the search box or changes page
- **THEN** the page refetches `/api/logs` with the new `search` (resetting page to 1) or `page` value

### Requirement: Upload screen
The system SHALL send a selected `.txt`/`.log` file via multipart/form-data to `POST /api/logs/upload`.

#### Scenario: Successful upload
- **WHEN** the user selects a file and submits
- **THEN** the file is posted as `file` and success/error states are shown

## Constraints
- Axios baseURL is `http://localhost:3333/api`.
- Styling via Tailwind CSS; icons via lucide-react; charts via recharts.
