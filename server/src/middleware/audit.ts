import { prisma } from '../db/prisma.js';

interface AuditParams {
  userId?: string;
  userName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'LOGIN' | 'EXPORT' | 'IMPORT';
  entity: 'CUSTOMER' | 'LEAD' | 'BOOKING' | 'PAYMENT' | 'PACKAGE' | 'AGENT' | 'USER' | 'EXPENSE' | 'QUOTATION' | 'SETTING' | 'CAB_BOOKING' | 'CALENDAR_EVENT' | 'SUPPLIER';
  entityId?: string;
  details?: string;
  ipAddress?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
