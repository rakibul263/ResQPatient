import { db } from "../../prisma/db.js";
import { AppError } from "../../utils/AppError.js";

const getMyDriverProfileFromDB = async (driverUserId: string) => {
  const profile = await db.orm.public.DriverProfile
    .where((dp) => dp.userId.eq(driverUserId))
    .where((dp) => dp.deletedAt.isNull())
    .first();

  if (!profile) {
    throw new AppError(404, "Driver profile not found.");
  }

  const ambulance = await db.orm.public.Ambulance
    .where((a) => a.driverId.eq(driverUserId))
    .where((a) => a.deletedAt.isNull())
    .first();

  const user = await db.orm.public.User
    .where((u) => u.id.eq(driverUserId))
    .first();

  return {
    profile,
    ambulance: ambulance || null,
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        }
      : null,
  };
};

const updateDriverProfileIntoDB = async (
  driverUserId: string,
  payload: { licenseNumber?: string; experienceYears?: number },
) => {
  const profile = await db.orm.public.DriverProfile
    .where((dp) => dp.userId.eq(driverUserId))
    .where((dp) => dp.deletedAt.isNull())
    .first();

  if (!profile) {
    throw new AppError(404, "Driver profile not found.");
  }

  const updateData: { licenseNumber?: string; experienceYears?: number; updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  };
  if (payload.licenseNumber !== undefined) updateData.licenseNumber = payload.licenseNumber;
  if (payload.experienceYears !== undefined) updateData.experienceYears = payload.experienceYears;

  await db.orm.public.DriverProfile
    .where((dp) => dp.id.eq(profile.id))
    .update(updateData);

  return await getMyDriverProfileFromDB(driverUserId);
};

const toggleAvailabilityIntoDB = async (
  driverUserId: string,
  isAvailable: boolean,
) => {
  const profile = await db.orm.public.DriverProfile
    .where((dp) => dp.userId.eq(driverUserId))
    .where((dp) => dp.deletedAt.isNull())
    .first();

  if (!profile) {
    throw new AppError(404, "Driver profile not found.");
  }

  await db.orm.public.DriverProfile
    .where((dp) => dp.id.eq(profile.id))
    .update({
      isAvailable,
      updatedAt: new Date().toISOString(),
    });

  return { isAvailable, message: `Driver availability set to ${isAvailable ? "Online" : "Offline"}` };
};

const getDriverTripsFromDB = async (
  driverUserId: string,
  query: any,
) => {
  const { page = 1, limit = 10, status } = query;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  let queryBuilder = db.orm.public.Dispatch
    .where((d) => d.driverId.eq(driverUserId));

  if (status) {
    queryBuilder = queryBuilder.where((d) => d.status.eq(status));
  }

  const trips = await queryBuilder
    .orderBy((d) => d.createdAt.desc())
    .limit(limitNum)
    .offset(offset)
    .all();

  const total = await db.orm.public.Dispatch
    .where((d) => d.driverId.eq(driverUserId))
    .aggregate((agg) => ({ count: agg.count() }));

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total: total.count,
      totalPages: Math.ceil(total.count / limitNum),
    },
    data: trips,
  };
};

export const DriverService = {
  getMyDriverProfileFromDB,
  updateDriverProfileIntoDB,
  toggleAvailabilityIntoDB,
  getDriverTripsFromDB,
};
