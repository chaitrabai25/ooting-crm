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

  // Soft and human-friendly error sanitization (no raw Prisma or DB errors exposed to users)
  let userFriendlyMessage = 'Unable to complete this action right now. Please try again shortly.';
  const rawMsg = String(err.message || '');
  const code = String(err.code || '');
  const errName = String(err.name || '');

  if (code === 'P2002' || rawMsg.includes('Unique constraint failed')) {
    userFriendlyMessage = 'A record with this information already exists in the system. Please verify your details.';
  } else if (code === 'P2025' || rawMsg.includes('Record to update not found') || rawMsg.includes('Record to delete does not exist')) {
    userFriendlyMessage = 'The requested record could not be found or has been updated elsewhere.';
  } else if (code === 'P2003' || rawMsg.includes('Foreign key constraint failed')) {
    userFriendlyMessage = 'This record is linked to other existing entries and cannot be removed.';
  } else if (code === 'P2000' || rawMsg.includes('Value too long for column')) {
    userFriendlyMessage = 'One or more of the entered details exceeds the permitted length.';
  } else if (errName.includes('Prisma') || rawMsg.toLowerCase().includes('prisma') || rawMsg.includes('invocation:')) {
    userFriendlyMessage = 'Some entered information could not be processed. Please check your entries and try again.';
  } else if (rawMsg.includes('ECONNREFUSED') || rawMsg.includes('ETIMEDOUT') || rawMsg.includes('Can\'t reach database server')) {
    userFriendlyMessage = 'Database service is responding slowly. Please try again in a few moments.';
  } else if (statusCode < 500 && err.message) {
    // For expected 4xx client errors (e.g. 400 Bad Request, 404 Not Found), retain message if clean
    userFriendlyMessage = err.message;
  }

  res.status(statusCode).json({
    message: userFriendlyMessage,
  });
}

export default errorHandler;
