import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    permissions?: string | null;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ message: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, status: true, permissions: true },
    });

    if (!user) {
      res.status(401).json({ message: 'User account not found.' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ message: 'Account is deactivated. Please contact your administrator.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    // SUPER_ADMIN has full bypass access
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Access denied: You do not have permission to perform this action.' });
      return;
    }

    next();
  };
}

export function requirePermission(moduleName: string, action: string = 'view') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    // SUPER_ADMIN has full bypass access
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    // If permissions string exists, parse it
    if (req.user.permissions) {
      try {
        const perms = JSON.parse(req.user.permissions);
        if (Array.isArray(perms)) {
          const directMatch = `${moduleName}:${action}`;
          const dotMatch = `${moduleName}.${action}`;
          const wildMatch = `${moduleName}:*`;
          if (perms.includes('*') || perms.includes(directMatch) || perms.includes(dotMatch) || perms.includes(wildMatch)) {
            next();
            return;
          }
        } else if (typeof perms === 'object' && perms !== null) {
          const modulePerms = perms[moduleName];
          if (modulePerms === true || modulePerms === '*') {
            next();
            return;
          }
          if (Array.isArray(modulePerms) && (modulePerms.includes(action) || modulePerms.includes('*'))) {
            next();
            return;
          }
          if (typeof modulePerms === 'object' && modulePerms !== null && modulePerms[action] === true) {
            next();
            return;
          }
        }
      } catch (e) {
        console.error('Failed to parse user permissions:', e);
      }
    }

    // Role-based defaults when custom permissions not explicitly set
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    if (req.user.role === 'SALES') {
      if (['leads', 'customers', 'bookings', 'cabs', 'suppliers', 'calendar', 'dashboard'].includes(moduleName)) {
        if (action !== 'delete') {
          next();
          return;
        }
      }
    }

    if (req.user.role === 'OPERATIONS') {
      if (['bookings', 'cabs', 'calendar', 'suppliers', 'dashboard'].includes(moduleName)) {
        if (action !== 'delete') {
          next();
          return;
        }
      }
    }

    if (req.user.role === 'ACCOUNTANT') {
      if (['reports', 'payments', 'bookings', 'cabs', 'dashboard'].includes(moduleName)) {
        if (action !== 'delete') {
          next();
          return;
        }
      }
    }

    res.status(403).json({ message: `Access denied: You do not have permission to ${action} ${moduleName}.` });
  };
}
