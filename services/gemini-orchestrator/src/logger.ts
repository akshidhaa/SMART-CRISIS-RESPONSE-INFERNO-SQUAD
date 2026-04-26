// Structured logging for Google Cloud Logging.
// In Cloud Run, JSON written to stdout is automatically parsed by Cloud Logging.
// Locally, we pretty-print for readability.

type Severity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface LogEntry {
  severity: Severity;
  message: string;
  [key: string]: unknown;
}

const isCloud = process.env.K_SERVICE !== undefined; // Cloud Run sets K_SERVICE

function write(entry: LogEntry): void {
  const line = isCloud
    ? JSON.stringify(entry)
    : `[${entry.severity}] ${entry.message} ${Object.keys(entry).length > 2 ? JSON.stringify(Object.fromEntries(Object.entries(entry).filter(([k]) => k !== 'severity' && k !== 'message'))) : ''}`;
  if (entry.severity === 'ERROR' || entry.severity === 'CRITICAL') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) =>
    write({ severity: 'DEBUG', message, ...data }),
  info: (message: string, data?: Record<string, unknown>) =>
    write({ severity: 'INFO', message, ...data }),
  warn: (message: string, data?: Record<string, unknown>) =>
    write({ severity: 'WARNING', message, ...data }),
  error: (message: string, data?: Record<string, unknown>) =>
    write({ severity: 'ERROR', message, ...data }),
  critical: (message: string, data?: Record<string, unknown>) =>
    write({ severity: 'CRITICAL', message, ...data }),
};
