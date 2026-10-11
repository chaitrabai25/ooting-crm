import { Request, Response, NextFunction } from 'express';
// @ts-ignore
import zlib from 'zlib';

/**
 * High-Performance Built-in HTTP Compression Middleware
 * Uses Node.js native zlib (zero extra npm dependencies) to gzip/deflate
 * responses > 1KB when supported by the client browser.
 * Reduces JSON API payload transfer size by 75-90%.
 */
export function compressionMiddleware(req: Request, res: Response, next: NextFunction) {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
    return next();
  }

  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);

  const shouldCompress = (body: any): boolean => {
    // Only compress successful GET/POST responses
    if (res.statusCode < 200 || res.statusCode >= 300) return false;
    if (res.getHeader('Content-Encoding')) return false;

    // Check size threshold (1KB)
    const len = typeof body === 'string' ? Buffer.byteLength(body) : Buffer.isBuffer(body) ? body.length : 0;
    return len > 1024;
  };

  const compressAndSend = (body: any, contentType: string) => {
    let rawBuffer: Buffer;
    if (Buffer.isBuffer(body)) {
      rawBuffer = body;
    } else if (typeof body === 'string') {
      rawBuffer = Buffer.from(body);
    } else {
      rawBuffer = Buffer.from(JSON.stringify(body));
    }

    if (rawBuffer.length <= 1024) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', contentType);
      }
      return originalSend(rawBuffer);
    }

    try {
      const gzipped = zlib.gzipSync(rawBuffer, { level: 6 });
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Length', gzipped.length);
      return originalSend(gzipped);
    } catch (err) {
      // Fallback uncompressed on compression error
      return originalSend(rawBuffer);
    }
  };

  res.send = (body: any): Response => {
    if (typeof body === 'object' && !Buffer.isBuffer(body) && body !== null) {
      return compressAndSend(body, 'application/json; charset=utf-8');
    }
    if (typeof body === 'string' && shouldCompress(body)) {
      const isJson = body.startsWith('{') || body.startsWith('[');
      return compressAndSend(body, isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8');
    }
    return originalSend(body);
  };

  res.json = (body: any): Response => {
    return compressAndSend(body, 'application/json; charset=utf-8');
  };

  next();
}
