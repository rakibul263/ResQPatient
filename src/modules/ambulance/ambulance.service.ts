import { db } from "../../prisma/db.js";
import { AppError } from "../../utils/AppError.js";
import { logAudit } from "../../utils/auditLogger.js";
import { deleteCache } from "../../utils/redis.js";
import { nowInstant } from "../../utils/temporal.js";

const createAmbulanceIntoDB = async (
  payload: {
    driverId?: string | null;
    vehicleNumber: string;
    vehicleType: "ICU" | "OXYGEN" | "BASIC";
    currentLat?: number;
    currentLng?: number;
  },
  adminUserId?: string,
) => {
  const existing = await db.orm.public.Ambulance
    .where((a) => a.vehicleNumber.eq(payload.vehicleNumber))
    .where((a) => a.deletedAt.isNull())
    .first();

  if (existing) {
    throw new AppError(409, "Ambulance with this vehicle number already exists.");
  }

  if (payload.driverId) {
    const driverId = payload.driverId;
    const driver = await db.orm.public.User
      .where((u) => u.id.eq(driverId))
      .where((u) => u.role.eq("DRIVER"))
      .first();

    if (!driver) {
      throw new AppError(404, "Specified driver does not exist or does not have DRIVER role.");
    }
  }

  const result = await db.orm.public.Ambulance.create({
    driverId: payload.driverId ?? null,
    vehicleNumber: payload.vehicleNumber,
    vehicleType: payload.vehicleType,
    status: "AVAILABLE",
    currentLat: payload.currentLat ?? null,
    currentLng: payload.currentLng ?? null,
    deletedAt: null,
    updatedAt: new Date().toISOString(),
  });

  await logAudit({
    userId: adminUserId,
    action: "AMBULANCE_CREATED",
    entity: "Ambulance",
    entityId: result.id,
    details: { vehicleNumber: result.vehicleNumber, vehicleType: result.vehicleType },
  });

  await deleteCache("ambulances:*");

  return result;
};

const getAllAmbulancesFromDB = async (query: any) => {
  const {
    type,
    status,
    search,
    page = 1,
    limit = 10,
  } = query;

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  let queryBuilder = db.orm.public.Ambulance.where((a) => a.deletedAt.isNull());

  if (type) {
    queryBuilder = queryBuilder.where((a) => a.vehicleType.eq(type));
  }
  if (status) {
    queryBuilder = queryBuilder.where((a) => a.status.eq(status));
  }
  if (search) {
    queryBuilder = queryBuilder.where((a) => a.vehicleNumber.ilike(`%${search}%`));
  }

  const ambulances = await queryBuilder
    .orderBy((a) => a.createdAt.desc())
    .limit(limitNum)
    .offset(offset)
    .all();

  const total = await db.orm.public.Ambulance
    .where((a) => a.deletedAt.isNull())
    .aggregate((agg) => ({ count: agg.count() }));

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total: total.count,
      totalPages: Math.ceil(total.count / limitNum),
    },
    data: ambulances,
  };
};

const getAmbulanceByIdFromDB = async (id: string) => {
  const ambulance = await db.orm.public.Ambulance
    .where((a) => a.id.eq(id))
    .where((a) => a.deletedAt.isNull())
    .first();

  if (!ambulance) {
    throw new AppError(404, "Ambulance not found.");
  }

  let driver = null;
  if (ambulance.driverId) {
    const driverId = ambulance.driverId;
    driver = await db.orm.public.User
      .where((u) => u.id.eq(driverId))
      .first();
  }

  return {
    ...ambulance,
    driver: driver
      ? {
          id: driver.id,
          name: driver.name,
          email: driver.email,
          phone: driver.phone,
        }
      : null,
  };
};

const updateAmbulanceIntoDB = async (
  id: string,
  payload: {
    vehicleNumber?: string;
    vehicleType?: "ICU" | "OXYGEN" | "BASIC";
    driverId?: string | null;
    status?: "AVAILABLE" | "BUSY" | "MAINTENANCE";
  },
) => {
  const existing = await db.orm.public.Ambulance
    .where((a) => a.id.eq(id))
    .where((a) => a.deletedAt.isNull())
    .first();

  if (!existing) {
    throw new AppError(404, "Ambulance not found.");
  }

  const updateData: any = { updatedAt: new Date().toISOString() };
  if (payload.vehicleNumber !== undefined) updateData.vehicleNumber = payload.vehicleNumber;
  if (payload.vehicleType !== undefined) updateData.vehicleType = payload.vehicleType;
  if (payload.driverId !== undefined) updateData.driverId = payload.driverId;
  if (payload.status !== undefined) updateData.status = payload.status;

  const result = await db.orm.public.Ambulance
    .where((a) => a.id.eq(id))
    .update(updateData);

  await deleteCache("ambulances:*");

  return result;
};

const deleteAmbulanceFromDB = async (id: string) => {
  const existing = await db.orm.public.Ambulance
    .where((a) => a.id.eq(id))
    .where((a) => a.deletedAt.isNull())
    .first();

  if (!existing) {
    throw new AppError(404, "Ambulance not found.");
  }

  await db.orm.public.Ambulance
    .where((a) => a.id.eq(id))
    .update({
      deletedAt: nowInstant(),
      updatedAt: new Date().toISOString(),
    });

  await deleteCache("ambulances:*");

  return { message: "Ambulance deleted successfully." };
};

const updateAmbulanceStatusIntoDB = async (
  id: string,
  status: "AVAILABLE" | "BUSY" | "MAINTENANCE",
) => {
  const existing = await db.orm.public.Ambulance
    .where((a) => a.id.eq(id))
    .where((a) => a.deletedAt.isNull())
    .first();

  if (!existing) {
    throw new AppError(404, "Ambulance not found.");
  }

  const result = await db.orm.public.Ambulance
    .where((a) => a.id.eq(id))
    .update({
      status,
      updatedAt: new Date().toISOString(),
    });

  await deleteCache("ambulances:*");

  return result;
};

const updateAmbulanceLocationIntoDB = async (
  driverIdOrAmbulanceId: string,
  payload: { currentLat: number; currentLng: number },
) => {
  let ambulance = await db.orm.public.Ambulance
    .where((a) => a.driverId.eq(driverIdOrAmbulanceId))
    .where((a) => a.deletedAt.isNull())
    .first();

  if (!ambulance) {
    ambulance = await db.orm.public.Ambulance
      .where((a) => a.id.eq(driverIdOrAmbulanceId))
      .where((a) => a.deletedAt.isNull())
      .first();
  }

  if (!ambulance) {
    throw new AppError(404, "Ambulance not found.");
  }

  const result = await db.orm.public.Ambulance
    .where((a) => a.id.eq(ambulance.id))
    .update({
      currentLat: payload.currentLat,
      currentLng: payload.currentLng,
      updatedAt: new Date().toISOString(),
    });

  await deleteCache("ambulances:*");

  return result;
};

export const AmbulanceService = {
  createAmbulanceIntoDB,
  getAllAmbulancesFromDB,
  getAmbulanceByIdFromDB,
  updateAmbulanceIntoDB,
  deleteAmbulanceFromDB,
  updateAmbulanceStatusIntoDB,
  updateAmbulanceLocationIntoDB,
};
