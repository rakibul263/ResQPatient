import { db } from "../prisma/db.js";
import { nowInstant } from "./temporal.js";

interface IAuditLogPayload {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const logAudit = async (payload: IAuditLogPayload): Promise<void> => {
  try {
    await db.orm.public.AuditLog.create({
      userId: payload.userId ?? null,
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId,
      details: payload.details ?? null,
      ipAddress: payload.ipAddress ?? null,
      userAgent: payload.userAgent ?? null,
      createdAt: nowInstant(),
    });
  } catch (error) {
    // Audit logging should not crash primary operations but should be logged to stderr
    console.error("Failed to create audit log entry:", error);
  }
};

export default logAudit;
