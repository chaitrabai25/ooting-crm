import { Request, Response, NextFunction } from 'express';
import { logger, sanitizeLogData } from '../services/logger.service.js';

const STATIC_EXT_REGEX = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|map)$/i;

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const path = req.originalUrl || req.url;

  // Skip noisy static asset requests (Vite chunks, images, icons)
  if (STATIC_EXT_REGEX.test(path)) {
    return next();
  }

  // Sanitize query params
  const sanitizedQuery = req.query ? sanitizeLogData(req.query) : {};
  const hasQuery = Object.keys(sanitizedQuery).length > 0;

  // Intercept response completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const user = (req as any).user;
    const userId = user?.id || null;
    const companyId = user?.companyId || null;

    const meta: Record<string, any> = {
      method: req.method,
      path: req.path,
      statusCode,
      durationMs: duration,
      ip,
    };

    if (userId) meta.userId = userId;
    if (companyId) meta.companyId = companyId;
    if (hasQuery) meta.query = sanitizedQuery;

    const logMsg = `${req.method} ${path} -> ${statusCode} (${duration}ms)`;

    if (statusCode >= 500) {
      logger.error('HTTP', logMsg, meta);
    } else if (statusCode >= 400) {
      logger.warn('HTTP', logMsg, meta);
    } else {
      logger.info('HTTP', logMsg, meta);
    }
  });

  next();
}

export default requestLogger;
