import { db } from "../../prisma/db.js";
import { AppError } from "../../utils/AppError.js";
import { logAudit } from "../../utils/auditLogger.js";
import { getCache, setCache } from "../../utils/redis.js";

const getUsersFromDB = async (query: any) => {
  const { role, isSuspended, search, page = 1, limit = 10 } = query;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  let queryBuilder = db.orm.public.User
    .where((u) => u.deletedAt.isNull());

  if (role) {
    queryBuilder = queryBuilder.where((u) => u.role.eq(role));
  }
  if (isSuspended !== undefined) {
    const suspendedBool = isSuspended === "true" || isSuspended === true;
    queryBuilder = queryBuilder.where((u) => u.isSuspended.eq(suspendedBool));
  }
  if (search) {
    queryBuilder = queryBuilder.where((u) => u.email.ilike(`%${search}%`));
  }

  const users = await queryBuilder
    .select("id", "name", "email", "phone", "role", "isVerified", "isSuspended", "createdAt")
    .orderBy((u) => u.createdAt.desc())
    .limit(limitNum)
    .offset(offset)
    .all();

  const total = await db.orm.public.User
    .where((u) => u.deletedAt.isNull())
    .aggregate((agg) => ({ count: agg.count() }));

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total: total.count,
      totalPages: Math.ceil(total.count / limitNum),
    },
    data: users,
  };
};

const updateUserStatusIntoDB = async (
  targetUserId: string,
  isSuspended: boolean,
  adminUserId: string,
  reason?: string,
) => {
  const user = await db.orm.public.User
    .where((u) => u.id.eq(targetUserId))
    .where((u) => u.deletedAt.isNull())
    .first();

  if (!user) {
    throw new AppError(404, "Target user not found.");
  }

  if (user.id === adminUserId) {
    throw new AppError(400, "Administrators cannot suspend their own account.");
  }

  const result = await db.orm.public.User
    .where((u) => u.id.eq(targetUserId))
    .update({
      isSuspended,
      updatedAt: new Date().toISOString(),
    });

  await logAudit({
    userId: adminUserId,
    action: isSuspended ? "USER_SUSPENDED" : "USER_ACTIVATED",
    entity: "User",
    entityId: targetUserId,
    details: { targetEmail: user.email, isSuspended, reason },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isSuspended,
    message: `User account has been ${isSuspended ? "suspended" : "reactivated"}.`,
  };
};

const updateUserRoleIntoDB = async (
  targetUserId: string,
  newRole: "PATIENT" | "DRIVER" | "ADMIN",
  adminUserId: string,
  reason?: string,
) => {
  const user = await db.orm.public.User
    .where((u) => u.id.eq(targetUserId))
    .where((u) => u.deletedAt.isNull())
    .first();

  if (!user) {
    throw new AppError(404, "Target user not found.");
  }

  const previousRole = user.role;

  await db.transaction(async (tx) => {
    await tx.orm.public.User
      .where((u) => u.id.eq(targetUserId))
      .update({
        role: newRole,
        updatedAt: new Date().toISOString(),
      });

    // If upgrading to DRIVER and no DriverProfile exists, create one
    if (newRole === "DRIVER") {
      const existingProfile = await tx.orm.public.DriverProfile
        .where((dp) => dp.userId.eq(targetUserId))
        .first();

      if (!existingProfile) {
        await tx.orm.public.DriverProfile.create({
          userId: targetUserId,
          licenseNumber: `DL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          experienceYears: 1,
          isVerified: true,
          isAvailable: true,
          deletedAt: null,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await logAudit({
      userId: adminUserId,
      action: "ROLE_CHANGED",
      entity: "User",
      entityId: targetUserId,
      details: { previousRole, newRole, reason },
    });
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    previousRole,
    newRole,
    message: `User role updated from ${previousRole} to ${newRole}.`,
  };
};

const getStatisticsFromDB = async () => {
  const cacheKey = "admin:statistics";
  const cached = await getCache<any>(cacheKey);
  if (cached) {
    return cached;
  }

  // Aggregate user counts
  const totalUsersAgg = await db.orm.public.User
    .where((u) => u.deletedAt.isNull())
    .aggregate((agg) => ({ count: agg.count() }));

  const patientsAgg = await db.orm.public.User
    .where((u) => u.deletedAt.isNull())
    .where((u) => u.role.eq("PATIENT"))
    .aggregate((agg) => ({ count: agg.count() }));

  const driversAgg = await db.orm.public.User
    .where((u) => u.deletedAt.isNull())
    .where((u) => u.role.eq("DRIVER"))
    .aggregate((agg) => ({ count: agg.count() }));

  // Aggregate ambulance counts
  const totalAmbulancesAgg = await db.orm.public.Ambulance
    .where((a) => a.deletedAt.isNull())
    .aggregate((agg) => ({ count: agg.count() }));

  const availableAmbulancesAgg = await db.orm.public.Ambulance
    .where((a) => a.deletedAt.isNull())
    .where((a) => a.status.eq("AVAILABLE"))
    .aggregate((agg) => ({ count: agg.count() }));

  // Aggregate hospitals & available beds
  const totalHospitalsAgg = await db.orm.public.Hospital
    .where((h) => h.deletedAt.isNull())
    .aggregate((agg) => ({ count: agg.count() }));

  const bedsAgg = await db.orm.public.Hospital
    .where((h) => h.deletedAt.isNull())
    .aggregate((agg) => ({ sumAvailableBeds: agg.sum("availableBeds") }));

  // Aggregate emergencies
  const totalEmergenciesAgg = await db.orm.public.Emergency
    .where((e) => e.deletedAt.isNull())
    .aggregate((agg) => ({ count: agg.count() }));

  const completedEmergenciesAgg = await db.orm.public.Emergency
    .where((e) => e.deletedAt.isNull())
    .where((e) => e.status.eq("COMPLETED"))
    .aggregate((agg) => ({ count: agg.count() }));

  // Aggregate payments & revenue
  const totalPaymentsAgg = await db.orm.public.Payment
    .aggregate((agg) => ({ count: agg.count() }));

  const paidPaymentsAgg = await db.orm.public.Payment
    .where((p) => p.status.eq("PAID"))
    .aggregate((agg) => ({
      count: agg.count(),
      totalRevenue: agg.sum("amount"),
    }));

  const stats = {
    users: {
      total: totalUsersAgg.count,
      patients: patientsAgg.count,
      drivers: driversAgg.count,
    },
    ambulances: {
      total: totalAmbulancesAgg.count,
      available: availableAmbulancesAgg.count,
      busy: totalAmbulancesAgg.count - availableAmbulancesAgg.count,
    },
    hospitals: {
      total: totalHospitalsAgg.count,
      totalAvailableBeds: bedsAgg.sumAvailableBeds ?? 0,
    },
    emergencies: {
      total: totalEmergenciesAgg.count,
      completed: completedEmergenciesAgg.count,
      active: totalEmergenciesAgg.count - completedEmergenciesAgg.count,
    },
    financials: {
      totalPayments: totalPaymentsAgg.count,
      paidPayments: paidPaymentsAgg.count,
      totalRevenue: paidPaymentsAgg.totalRevenue ?? 0,
      currency: "USD",
    },
    generatedAt: new Date().toISOString(),
  };

  // Cache statistics for 60 seconds
  await setCache(cacheKey, stats, 60);

  return stats;
};

const getAuditLogsFromDB = async (query: any) => {
  const { action, userId, entity, page = 1, limit = 20 } = query;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const offset = (pageNum - 1) * limitNum;

  let queryBuilder = db.orm.public.AuditLog;

  if (action) {
    queryBuilder = queryBuilder.where((al) => al.action.eq(action));
  }
  if (userId) {
    queryBuilder = queryBuilder.where((al) => al.userId.eq(userId));
  }
  if (entity) {
    queryBuilder = queryBuilder.where((al) => al.entity.eq(entity));
  }

  const logs = await queryBuilder
    .orderBy((al) => al.createdAt.desc())
    .limit(limitNum)
    .offset(offset)
    .all();

  const total = await db.orm.public.AuditLog
    .aggregate((agg) => ({ count: agg.count() }));

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total: total.count,
      totalPages: Math.ceil(total.count / limitNum),
    },
    data: logs,
  };
};

const getAllEmergenciesAdminFromDB = async (query: any) => {
  const { page = 1, limit = 10, status } = query;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  let queryBuilder = db.orm.public.Emergency
    .where((e) => e.deletedAt.isNull());

  if (status) {
    queryBuilder = queryBuilder.where((e) => e.status.eq(status));
  }

  const emergencies = await queryBuilder
    .orderBy((e) => e.createdAt.desc())
    .limit(limitNum)
    .offset(offset)
    .all();

  const total = await db.orm.public.Emergency
    .where((e) => e.deletedAt.isNull())
    .aggregate((agg) => ({ count: agg.count() }));

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total: total.count,
      totalPages: Math.ceil(total.count / limitNum),
    },
    data: emergencies,
  };
};

const getAllPaymentsAdminFromDB = async (query: any) => {
  const { page = 1, limit = 10, status } = query;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  let queryBuilder = db.orm.public.Payment;

  if (status) {
    queryBuilder = queryBuilder.where((p) => p.status.eq(status));
  }

  const payments = await queryBuilder
    .orderBy((p) => p.createdAt.desc())
    .limit(limitNum)
    .offset(offset)
    .all();

  const total = await db.orm.public.Payment
    .aggregate((agg) => ({ count: agg.count() }));

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total: total.count,
      totalPages: Math.ceil(total.count / limitNum),
    },
    data: payments,
  };
};

export const AdminService = {
  getUsersFromDB,
  updateUserStatusIntoDB,
  updateUserRoleIntoDB,
  getStatisticsFromDB,
  getAuditLogsFromDB,
  getAllEmergenciesAdminFromDB,
  getAllPaymentsAdminFromDB,
};
