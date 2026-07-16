export interface MockLogOptions {
  count: number;
  days: number;
  service?: string;
}

const LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL'] as const;
const MESSAGES = [
  'Request completed',
  'Cache miss',
  'DB connection slow',
  'User login',
  'Upstream timeout',
  'Slow query detected',
  'Health check passed',
  'Token refreshed',
];
const ROTATING_SERVICES = ['web', 'api', 'db', 'auth'];

export function generateMockLogs(opts: MockLogOptions): string {
  const count = Math.min(100, Math.max(1, Math.floor(opts.count)));
  const days = Math.min(30, Math.max(1, Math.floor(opts.days)));
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const nonce = Math.random().toString(36).slice(2, 10);

  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const level = LEVELS[Math.floor(Math.random() * LEVELS.length)];
    const timestamp = new Date(now - Math.random() * windowMs).toISOString();
    const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    const service = opts.service && opts.service.length > 0
      ? opts.service
      : ROTATING_SERVICES[i % ROTATING_SERVICES.length];
    lines.push(`[${timestamp}] [${level}] ${message} #${nonce} (service=${service})`);
  }

  return lines.join('\n');
}
