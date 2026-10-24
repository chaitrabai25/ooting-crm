import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../services/logger.service.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const path = req.originalUrl || req.path;
  const method = req.method;

  if (err instanceof ZodError) {
    const errorDetails = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    logger.warn('Validation', `Validation error on ${method} ${path}: ${errorDetails}`, {
      path,
      method,
      errors: err.flatten().fieldErrors,
    });
    res.status(400).json({
      message: `Validation error: ${errorDetails}`,
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  const logMeta = {
    path,
    method,
    statusCode,
    ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
  };

  if (statusCode >= 500) {
    logger.error('API Error', `${method} ${path} failed with ${statusCode}: ${err.message || 'Internal Error'}`, err, logMeta);
  } else {
    logger.warn('API Error', `${method} ${path} returned ${statusCode}: ${err.message}`, logMeta);
  }

  const message = err.message || 'An internal server error occurred.';

  res.status(statusCode).json({
    message,
  });
}

export default errorHandler;
