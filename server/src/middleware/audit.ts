import { prisma } from '../db/prisma.js';

interface AuditParams {
  userId?: string;
  userName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT';
  entity: 'CUSTOMER' | 'LEAD' | 'BOOKING' | 'PAYMENT' | 'PACKAGE' | 'AGENT' | 'USER' | 'EXPENSE' | 'QUOTATION' | 'SETTING' | 'CAB_BOOKING' | 'CALENDAR_EVENT' | 'SUPPLIER' | 'TOUR_GUIDE' | 'TOUR_ASSIGNMENT' | 'ORGANIZATION_MEMBER' | 'TOUR_EXPENSE';
  entityId?: string;
  details?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  companyId?: string | null;
}

export function logAudit(params: AuditParams): Promise<void> {
  try {
    const oldValueStr = params.oldValue !== undefined && params.oldValue !== null
      ? (typeof params.oldValue === 'string' ? params.oldValue : JSON.stringify(params.oldValue))
      : null;

    const newValueStr = params.newValue !== undefined && params.newValue !== null
      ? (typeof params.newValue === 'string' ? params.newValue : JSON.stringify(params.newValue))
      : null;

    // Execute asynchronously in the background so API responses are never delayed by audit log database writes
    prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        companyId: params.companyId || undefined,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        oldValue: oldValueStr,
        newValue: newValueStr,
        ipAddress: params.ipAddress,
      },
    }).catch((err) => {
      console.error('Failed to write audit log in background:', err);
    });
  } catch (err) {
    console.error('Failed to prepare audit log:', err);
  }
  return Promise.resolve();
}
