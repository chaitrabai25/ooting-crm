import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

const LOG_SEVERITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4,
};

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'pass',
  'token',
  'refreshtoken',
  'accesstoken',
  'otp',
  'otphash',
  'secret',
  'jwt',
  'jwtsecret',
  'authorization',
  'cookie',
  'set-cookie',
  'apikey',
  'creditcard',
  'cardnumber',
  'cvv',
  'pin',
]);

/**
 * Deep sanitization helper to strip sensitive fields (passwords, tokens, OTPs) from logs.
 */
export function sanitizeLogData(data: any, seen = new WeakSet()): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') {
    if (typeof data === 'string' && data.toLowerCase().startsWith('bearer ')) {
      return 'Bearer [REDACTED]';
    }
    return data;
  }

  // Prevent circular reference crash
  if (seen.has(data)) return '[Circular]';
  seen.add(data);

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, seen));
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack,
      ...(data as any),
    };
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeLogData(val, seen);
    }
  }
  return sanitized;
}

export class LoggerService {
  private logDir: string;
  private appLogPath: string;
  private errorLogPath: string;
  private maxSizeBytes: number;
  private maxFiles: number;
  private minLevel: LogLevel;
  private fileSystemAvailable: boolean = true;

  constructor() {
    const serverDir = path.resolve(__dirname, '../..');
    this.logDir = process.env.LOG_DIR
      ? path.resolve(process.env.LOG_DIR)
      : path.resolve(serverDir, 'logs');

    this.appLogPath = path.join(this.logDir, 'app.log');
    this.errorLogPath = path.join(this.logDir, 'error.log');

    const maxMb = parseInt(process.env.LOG_MAX_SIZE_MB || '10', 10);
    this.maxSizeBytes = (isNaN(maxMb) ? 10 : maxMb) * 1024 * 1024;

    const maxFiles = parseInt(process.env.LOG_MAX_FILES || '5', 10);
    this.maxFiles = isNaN(maxFiles) ? 5 : maxFiles;

    const envLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG')).toUpperCase();
    this.minLevel = (LOG_SEVERITY[envLevel as LogLevel] !== undefined ? envLevel : 'INFO') as LogLevel;

    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      this.fileSystemAvailable = true;
    } catch (err: any) {
      console.warn('[LoggerService] Warning: Unable to initialize logs directory on filesystem:', err?.message);
      this.fileSystemAvailable = false;
    }
  }

  public getLogDir(): string {
    return this.logDir;
  }

  public getAppLogPath(): string {
    return this.appLogPath;
  }

  public getErrorLogPath(): string {
    return this.errorLogPath;
  }

  /**
   * Size-based log file rotation.
   * If app.log exceeds maxSizeBytes, rotates:
   * app.log -> app.1.log -> app.2.log ... up to maxFiles.
   */
  private checkAndRotate(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) return;
      const stats = fs.statSync(filePath);
      if (stats.size < this.maxSizeBytes) return;

      const ext = path.extname(filePath);
      const base = filePath.slice(0, filePath.length - ext.length);

      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const currentFile = `${base}.${i}${ext}`;
        const nextFile = `${base}.${i + 1}${ext}`;
        if (fs.existsSync(currentFile)) {
          if (i + 1 > this.maxFiles) {
            fs.unlinkSync(currentFile);
          } else {
            try {
              if (fs.existsSync(nextFile)) fs.unlinkSync(nextFile);
              fs.renameSync(currentFile, nextFile);
            } catch {
              // Ignore atomic rename races
            }
          }
        }
      }

      const firstRotated = `${base}.1${ext}`;
      if (fs.existsSync(firstRotated)) {
        try {
          fs.unlinkSync(firstRotated);
        } catch {
          // Ignore
        }
      }
      fs.renameSync(filePath, firstRotated);
    } catch (rotateErr: any) {
      console.error('[LoggerService] Log rotation notice:', rotateErr?.message);
    }
  }

  private writeToFile(filePath: string, formattedMessage: string): void {
    if (!this.fileSystemAvailable) return;

    try {
      this.checkAndRotate(filePath);
      fs.appendFileSync(filePath, formattedMessage + '\n', { encoding: 'utf-8', flag: 'a' });
    } catch (writeErr: any) {
      // Graceful fallback: Do not crash application under any logging error
      console.error('[LoggerService] File write failure:', writeErr?.message);
    }
  }

  public log(level: LogLevel, component: string, message: string, meta?: any, extra?: any): void {
    const levelSeverity = LOG_SEVERITY[level];
    const minSeverity = LOG_SEVERITY[this.minLevel];

    if (levelSeverity < minSeverity) {
      return;
    }

    let resolvedMeta = meta;
    let stackTrace = '';

    if (meta instanceof Error) {
      stackTrace = meta.stack ? `\nStack: ${meta.stack}` : '';
      if (extra && typeof extra === 'object') {
        resolvedMeta = { error: meta.message, ...extra };
      } else {
        resolvedMeta = { error: meta.message };
      }
    } else if (extra !== undefined && extra !== null) {
      if (typeof meta === 'object' && meta !== null) {
        resolvedMeta = { ...meta, ...extra };
      } else {
        resolvedMeta = { details: meta, ...extra };
      }
    }

    const timestamp = new Date().toISOString();
    let metaStr = '';

    if (resolvedMeta !== undefined && resolvedMeta !== null) {
      if (typeof resolvedMeta === 'object') {
        const sanitized = sanitizeLogData(resolvedMeta);
        if (sanitized.stack) {
          if (!stackTrace) stackTrace = `\nStack: ${sanitized.stack}`;
          delete sanitized.stack;
        }
        try {
          metaStr = Object.keys(sanitized).length > 0 ? ` ${JSON.stringify(sanitized)}` : '';
        } catch {
          metaStr = ' [Metadata serialization failed]';
        }
      } else {
        metaStr = ` ${String(resolvedMeta)}`;
      }
    }

    const logEntry = `[${timestamp}] [${level.padEnd(8)}] [${component}] ${message}${metaStr}${stackTrace}`;

    // 1. Output to standard console
    if (level === 'ERROR' || level === 'CRITICAL') {
      console.error(logEntry);
    } else if (level === 'WARNING') {
      console.warn(logEntry);
    } else if (level === 'DEBUG') {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(logEntry);
      }
    } else {
      console.log(logEntry);
    }

    // 2. Write to app.log (all configured events)
    this.writeToFile(this.appLogPath, logEntry);

    // 3. Write to error.log (only ERROR and CRITICAL)
    if (level === 'ERROR' || level === 'CRITICAL') {
      this.writeToFile(this.errorLogPath, logEntry);
    }
  }

  public debug(component: string, message: string, meta?: any): void {
    this.log('DEBUG', component, message, meta);
  }

  public info(component: string, message: string, meta?: any): void {
    this.log('INFO', component, message, meta);
  }

  public warn(component: string, message: string, meta?: any): void {
    this.log('WARNING', component, message, meta);
  }

  public error(component: string, message: string, errorOrMeta?: any, extra?: any): void {
    this.log('ERROR', component, message, errorOrMeta, extra);
  }

  public critical(component: string, message: string, errorOrMeta?: any, extra?: any): void {
    this.log('CRITICAL', component, message, errorOrMeta, extra);
  }
}

// Export singleton instance
export const logger = new LoggerService();
export default logger;
