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
    companyId: string;
    company?: any;
    permissions?: string | null;
    isPlatformMasterAdmin: boolean;
  };
}

export const OOTING_MASTER_COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

/**
 * Global Authentication Middleware
 * Validates JWT, verifies active user status, enforces organization status,
 * and performs real-time session revocation verification.
 */
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
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      companyId?: string;
      iat?: number;
      tokenVersion?: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        permissions: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            isOoting: true,
            tokenRevocationVersion: true,
            maxStaffLimit: true,
            orgCode: true,
            suspensionReason: true,
            suspendedAt: true,
            subscriptionTier: true,
            subscriptionExpiresAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({ message: 'User account not found.' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ message: 'Account is deactivated. Please contact your administrator.' });
      return;
    }

    const companyId = user.companyId || OOTING_MASTER_COMPANY_ID;
    const company = user.company;

    // Fail closed: If no company found and not master Ooting
    if (!company && companyId !== OOTING_MASTER_COMPANY_ID) {
      res.status(401).json({ message: 'Associated organization not found. Access denied.' });
      return;
    }

    // -------------------------------------------------------------------------
    // CRITICAL SECURITY: Immediate Server-Side Suspension Enforcement
    // -------------------------------------------------------------------------
    if (company && company.status === 'SUSPENDED') {
      res.status(403).json({
        code: 'ORGANIZATION_SUSPENDED',
        error: 'ORGANIZATION_SUSPENDED',
        message: "Your organization's access has been suspended. Please contact Ooting Support for assistance.",
        reason: company.suspensionReason || 'Account suspended pending administrative review.',
        suspendedAt: company.suspendedAt,
        support: {
          email: 'support@ooting.com',
          phone: '+91 6362845243',
        },
        supportEmail: 'support@ooting.com',
        supportPhone: '+91 6362845243',
      });
      return;
    }

    if (company && company.status === 'EXPIRED') {
      res.status(403).json({
        code: 'ORGANIZATION_EXPIRED',
        error: 'ORGANIZATION_EXPIRED',
        message: 'Your organization subscription has expired. Please contact support to renew access.',
        supportEmail: 'support@ooting.com',
        supportPhone: '+91 6362845243',
      });
      return;
    }

    if (company && company.status === 'TERMINATED') {
      res.status(403).json({
        code: 'ORGANIZATION_TERMINATED',
        error: 'ORGANIZATION_TERMINATED',
        message: 'Your organization account has been terminated.',
        supportEmail: 'support@ooting.com',
      });
      return;
    }

    // Check real-time tokenRevocationVersion
    if (company && (decoded.tokenVersion ?? 1) < company.tokenRevocationVersion) {
      res.status(401).json({ message: 'Session has been invalidated. Please log in again.' });
      return;
    }

    // Check real-time session revocations
    if (decoded.iat && company) {
      const tokenIssuedAt = new Date(decoded.iat * 1000);
      const revocation = await prisma.sessionRevocation.findFirst({
        where: {
          companyId,
          OR: [{ userId: null }, { userId: user.id }],
          revokedAt: { gte: tokenIssuedAt },
        },
      });

      if (revocation) {
        res.status(401).json({ message: 'Session has been invalidated. Please log in again.' });
        return;
      }
    }

    // Determine if this user is an authorized Ooting Platform Master Administrator
    const isPlatformMasterAdmin = Boolean(
      (company?.isOoting === true || companyId === OOTING_MASTER_COMPANY_ID) &&
      (user.role === 'SUPER_ADMIN' || user.role === 'PLATFORM_MASTER_ADMIN')
    );

    req.user = {
      ...user,
      companyId,
      company,
      isPlatformMasterAdmin,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

/**
 * Strict Platform Master Admin Guard
 * Strictly restricts endpoint access to authorized Ooting Platform Administrators
 */
export function requirePlatformMasterAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  if (!req.user.isPlatformMasterAdmin) {
    res.status(403).json({
      message: 'Access denied: Strictly restricted to Ooting Platform Master Administrators.',
    });
    return;
  }

  next();
}

/**
 * Role-Based Authorization Middleware
 * Note: Customer Super Admins satisfy 'SUPER_ADMIN' for tenant resources only.
 * Only Platform Master Admins have full system-wide cross-tenant bypass.
 */
export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    // Platform Master Admin has global bypass
    if (req.user.isPlatformMasterAdmin) {
      next();
      return;
    }

    // Tenant-level role match
    if (roles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({ message: 'Access denied: You do not have permission to perform this action.' });
  };
}

/**
 * Granular Module Permission Middleware
 */
export function requirePermission(moduleName: string, action: string = 'view') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    // Platform Master Admin has global bypass
    if (req.user.isPlatformMasterAdmin) {
      next();
      return;
    }

    // Customer Super Admin has company-wide bypass for CRM business modules
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      next();
      return;
    }

    // If custom permissions string exists, parse it
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

    // Role-based defaults
    if (req.user.role === 'SALES') {
      if (['leads', 'customers', 'bookings', 'cabs', 'suppliers', 'calendar', 'dashboard', 'quotations', 'packages'].includes(moduleName)) {
        if (action !== 'delete') {
          next();
          return;
        }
      }
    }

    if (req.user.role === 'OPERATIONS') {
      if (['bookings', 'cabs', 'calendar', 'suppliers', 'dashboard', 'packages', 'places', 'hotels'].includes(moduleName)) {
        if (action !== 'delete') {
          next();
          return;
        }
      }
    }

    if (req.user.role === 'ACCOUNTANT') {
      if (['reports', 'payments', 'bookings', 'cabs', 'dashboard', 'expenses'].includes(moduleName)) {
        if (action !== 'delete') {
          next();
          return;
        }
      }
    }

    if (req.user.role === 'AGENT') {
      if (['bookings', 'calendar', 'dashboard', 'quotations'].includes(moduleName)) {
        if (action === 'view') {
          next();
          return;
        }
      }
    }

    if (req.user.role === 'TOUR_GUIDE') {
      if (moduleName === 'guides' && ['view', 'report', 'progress', 'complete', 'expense'].includes(action)) {
        next();
        return;
      }
      if (moduleName === 'dashboard' && action === 'view') {
        next();
        return;
      }
    }

    res.status(403).json({ message: `Access denied: You do not have permission to ${action} ${moduleName}.` });
  };
}
