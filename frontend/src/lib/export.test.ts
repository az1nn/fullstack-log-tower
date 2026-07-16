import { describe, it, expect } from 'vitest';
import { toCsv, toJson, type Log } from '../lib/export';

const sample: Log[] = [
  { id: '1', timestamp: '2024-01-01T00:00:00Z', level: 'INFO', service: 'auth', message: 'started' },
  { id: '2', timestamp: '2024-01-02T00:00:00Z', level: 'ERROR', service: 'db', message: 'db error' },
];

describe('toCsv', () => {
  it('produces header plus one line per row', () => {
    const csv = toCsv(sample);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,timestamp,level,service,message');
    expect(lines).toHaveLength(3);
  });

  it('escapes commas by quoting', () => {
    const rows: Log[] = [{ id: '1', timestamp: 't', level: 'INFO', message: 'a,b,c' }];
    const csv = toCsv(rows);
    expect(csv).toContain('"a,b,c"');
  });

  it('escapes quotes by doubling them', () => {
    const rows: Log[] = [{ id: '1', timestamp: 't', level: 'INFO', message: 'he said "hi"' }];
    const csv = toCsv(rows);
    expect(csv).toContain('"he said ""hi"""');
  });

  it('escapes newlines by quoting', () => {
    const rows: Log[] = [{ id: '1', timestamp: 't', level: 'INFO', message: 'line1\nline2' }];
    const csv = toCsv(rows);
    expect(csv).toContain('"line1\nline2"');
  });

  it('leaves normal values unquoted', () => {
    expect(toCsv(sample)).toContain('started');
    expect(toCsv(sample)).not.toContain('"started"');
  });
});

describe('toJson', () => {
  it('serializes rows with pretty print', () => {
    const json = toJson(sample);
    expect(JSON.parse(json)).toEqual([
      { id: '1', timestamp: '2024-01-01T00:00:00Z', level: 'INFO', service: 'auth', message: 'started' },
      { id: '2', timestamp: '2024-01-02T00:00:00Z', level: 'ERROR', service: 'db', message: 'db error' },
    ]);
  });

  it('normalizes missing service to null', () => {
    const rows: Log[] = [{ id: '1', timestamp: 't', level: 'INFO', message: 'm' }];
    const parsed = JSON.parse(toJson(rows));
    expect(parsed[0].service).toBeNull();
  });
});
