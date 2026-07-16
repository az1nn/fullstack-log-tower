import { describe, it, expect } from 'vitest';
import { generateMockLogs } from './mockLogs';

const PARSER = /^\[(.*?)\]\s+\[(.*?)\]\s+(.*?)(?:\s+\(service=(.*?)\))?\s*$/;
const VALID_LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL'];

describe('generateMockLogs', () => {
  it('returns a string with the requested number of lines', () => {
    const text = generateMockLogs({ count: 5, days: 1 });
    expect(text.split('\n')).toHaveLength(5);
  });

  it('produces lines that parse with a valid level and service suffix', () => {
    const text = generateMockLogs({ count: 20, days: 1 });
    const lines = text.split('\n');
    expect(lines.length).toBe(20);
    for (const line of lines) {
      const match = line.match(PARSER);
      expect(match).not.toBeNull();
      const [, , level, , service] = match!;
      expect(VALID_LEVELS).toContain(level);
      expect(service).toBeTruthy();
    }
  });

  it('uses the provided service for every line', () => {
    const text = generateMockLogs({ count: 10, days: 1, service: 'myapp' });
    for (const line of text.split('\n')) {
      const match = line.match(PARSER);
      expect(match).not.toBeNull();
      expect(match![4]).toBe('myapp');
    }
  });

  it('clamps count to the [1,100] range', () => {
    expect(generateMockLogs({ count: 999, days: 1 }).split('\n').length).toBeLessThanOrEqual(100);
    expect(generateMockLogs({ count: 0, days: 1 }).split('\n').length).toBeGreaterThanOrEqual(1);
  });
});
