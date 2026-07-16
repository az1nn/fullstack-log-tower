export type Log = {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'FATAL';
  service?: string;
  message: string;
};

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Log[]): string {
  const header = ['id', 'timestamp', 'level', 'service', 'message'];
  const lines = [header.join(',')];

  for (const row of rows) {
    lines.push([
      escapeCsv(row.id ?? ''),
      escapeCsv(row.timestamp ?? ''),
      escapeCsv(row.level ?? ''),
      escapeCsv(row.service ?? ''),
      escapeCsv(row.message ?? ''),
    ].join(','));
  }

  return lines.join('\n');
}

export function downloadCsv(rows: Log[], filename = 'logs.csv') {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export function toJson(rows: Log[]): string {
  const normalized = rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    level: row.level,
    service: row.service ?? null,
    message: row.message,
  }));

  return JSON.stringify(normalized, null, 2);
}

export function downloadJson(rows: Log[], filename = 'logs.json') {
  const blob = new Blob([toJson(rows)], {
    type: 'application/json;charset=utf-8;',
  });
  triggerDownload(blob, filename);
}
