import { db } from "../../prisma/db.js";
import { AppError } from "../../utils/AppError.js";
import { calculateHaversineDistance } from "../../utils/geo.js";
import { logAudit } from "../../utils/auditLogger.js";
import { getCache, setCache, deleteCache } from "../../utils/redis.js";
import { nowInstant } from "../../utils/temporal.js";

const createHospitalIntoDB = async (
  payload: {
    name: string;
    address: string;
    contactNumber: string;
    lat: number;
    lng: number;
    capacity?: number;
    availableBeds?: number;
    isAvailable?: boolean;
  },
  adminUserId?: string,
) => {
  const result = await db.orm.public.Hospital.create({
    name: payload.name,
    address: payload.address,
    contactNumber: payload.contactNumber,
    lat: payload.lat,
    lng: payload.lng,
    capacity: payload.capacity ?? 100,
    availableBeds: payload.availableBeds ?? 20,
    isAvailable: payload.isAvailable ?? true,
    deletedAt: null,
    updatedAt: new Date().toISOString(),
  });

  await logAudit({
    userId: adminUserId,
    action: "HOSPITAL_CREATED",
    entity: "Hospital",
    entityId: result.id,
    details: { name: result.name, address: result.address },
  });

  // Invalidate hospitals cache
  await deleteCache("hospitals:*");

  return result;
};

const getAllHospitalsFromDB = async (query: any) => {
  const {
    isAvailable,
    search,
    page = 1,
    limit = 10,
  } = query;

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  let queryBuilder = db.orm.public.Hospital.where((h) => h.deletedAt.isNull());

  if (isAvailable !== undefined) {
    const availBool = isAvailable === "true" || isAvailable === true;
    queryBuilder = queryBuilder.where((h) => h.isAvailable.eq(availBool));
  }
  if (search) {
    queryBuilder = queryBuilder.where((h) => h.name.ilike(`%${search}%`));
  }

  const hospitals = await queryBuilder
    .orderBy((h) => h.createdAt.desc())
    .limit(limitNum)
    .offset(offset)
    .all();

  const total = await db.orm.public.Hospital
    .where((h) => h.deletedAt.isNull())
    .aggregate((agg) => ({ count: agg.count() }));

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total: total.count,
      totalPages: Math.ceil(total.count / limitNum),
    },
    data: hospitals,
  };
};

const searchHospitalsFromDB = async (query: any) => {
  const cacheKey = `hospitals:search:${JSON.stringify(query)}`;
  const cached = await getCache<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const {
    lat,
    lng,
    radiusKm = 25,
    minBeds = 0,
    search,
    page = 1,
    limit = 10,
  } = query;

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;

  let hospitals = await db.orm.public.Hospital
    .where((h) => h.deletedAt.isNull())
    .where((h) => h.isAvailable.eq(true))
    .all();

  if (minBeds > 0) {
    hospitals = hospitals.filter((h) => h.availableBeds >= Number(minBeds));
  }
  if (search) {
    const searchLower = String(search).toLowerCase();
    hospitals = hospitals.filter(
      (h) =>
        h.name.toLowerCase().includes(searchLower) ||
        h.address.toLowerCase().includes(searchLower),
    );
  }

  let mappedResults = hospitals.map((h) => {
    let distanceKm: number | null = null;
    if (lat !== undefined && lng !== undefined) {
      distanceKm = calculateHaversineDistance(
        Number(lat),
        Number(lng),
        h.lat,
        h.lng,
      );
    }
    return {
      ...h,
      distanceKm,
    };
  });

  if (lat !== undefined && lng !== undefined) {
    mappedResults = mappedResults
      .filter((h) => h.distanceKm !== null && h.distanceKm <= Number(radiusKm))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }

  const total = mappedResults.length;
  const offset = (pageNum - 1) * limitNum;
  const paginated = mappedResults.slice(offset, offset + limitNum);

  const result = {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
    data: paginated,
  };

  // Cache search results for 2 minutes
  await setCache(cacheKey, result, 120);

  return result;
};

const getHospitalByIdFromDB = async (id: string) => {
  const hospital = await db.orm.public.Hospital
    .where((h) => h.id.eq(id))
    .where((h) => h.deletedAt.isNull())
    .first();

  if (!hospital) {
    throw new AppError(404, "Hospital not found.");
  }

  return hospital;
};

const updateHospitalIntoDB = async (
  id: string,
  payload: {
    name?: string;
    address?: string;
    contactNumber?: string;
    lat?: number;
    lng?: number;
    capacity?: number;
    availableBeds?: number;
    isAvailable?: boolean;
  },
) => {
  const existing = await db.orm.public.Hospital
    .where((h) => h.id.eq(id))
    .where((h) => h.deletedAt.isNull())
    .first();

  if (!existing) {
    throw new AppError(404, "Hospital not found.");
  }

  const updateData: any = { updatedAt: new Date().toISOString() };
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.address !== undefined) updateData.address = payload.address;
  if (payload.contactNumber !== undefined) updateData.contactNumber = payload.contactNumber;
  if (payload.lat !== undefined) updateData.lat = payload.lat;
  if (payload.lng !== undefined) updateData.lng = payload.lng;
  if (payload.capacity !== undefined) updateData.capacity = payload.capacity;
  if (payload.availableBeds !== undefined) updateData.availableBeds = payload.availableBeds;
  if (payload.isAvailable !== undefined) updateData.isAvailable = payload.isAvailable;

  const result = await db.orm.public.Hospital
    .where((h) => h.id.eq(id))
    .update(updateData);

  // Invalidate hospitals cache
  await deleteCache("hospitals:*");

  return result;
};

const deleteHospitalFromDB = async (id: string) => {
  const existing = await db.orm.public.Hospital
    .where((h) => h.id.eq(id))
    .where((h) => h.deletedAt.isNull())
    .first();

  if (!existing) {
    throw new AppError(404, "Hospital not found.");
  }

  await db.orm.public.Hospital
    .where((h) => h.id.eq(id))
    .update({
      deletedAt: nowInstant(),
      updatedAt: new Date().toISOString(),
    });

  // Invalidate hospitals cache
  await deleteCache("hospitals:*");

  return { message: "Hospital deleted successfully." };
};

export const HospitalService = {
  createHospitalIntoDB,
  getAllHospitalsFromDB,
  searchHospitalsFromDB,
  getHospitalByIdFromDB,
  updateHospitalIntoDB,
  deleteHospitalFromDB,
};
