import { db } from "../../prisma/db.js";
import { AppError } from "../../utils/AppError.js";
import { logAudit } from "../../utils/auditLogger.js";
import { nowInstant } from "../../utils/temporal.js";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["EN_ROUTE"],
  EN_ROUTE: ["ARRIVED"],
  ARRIVED: ["PICKED_UP"],
  PICKED_UP: ["AT_HOSPITAL"],
  AT_HOSPITAL: ["COMPLETED"],
};

const getMyDispatchesFromDB = async (
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

  const dispatches = await queryBuilder
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
    data: dispatches,
  };
};

const getDispatchByIdFromDB = async (
  dispatchId: string,
  user: { id: string; role: string },
) => {
  const dispatch = await db.orm.public.Dispatch
    .where((d) => d.id.eq(dispatchId))
    .first();

  if (!dispatch) {
    throw new AppError(404, "Dispatch record not found.");
  }

  const emergency = await db.orm.public.Emergency
    .where((e) => e.id.eq(dispatch.emergencyId))
    .first();

  // Access check: assigned driver, patient of emergency, or admin
  const isDriver = dispatch.driverId === user.id;
  const isPatient = emergency && emergency.patientId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isDriver && !isPatient && !isAdmin) {
    throw new AppError(403, "You do not have permission to view this dispatch.");
  }

  const ambulance = await db.orm.public.Ambulance
    .where((a) => a.id.eq(dispatch.ambulanceId))
    .first();

  const driver = await db.orm.public.User
    .where((u) => u.id.eq(dispatch.driverId))
    .first();

  return {
    ...dispatch,
    emergency: emergency || null,
    ambulance: ambulance || null,
    driver: driver
      ? {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          email: driver.email,
        }
      : null,
  };
};

const acceptDispatchIntoDB = async (
  dispatchId: string,
  driverUserId: string,
) => {
  const dispatch = await db.orm.public.Dispatch
    .where((d) => d.id.eq(dispatchId))
    .first();

  if (!dispatch) {
    throw new AppError(404, "Dispatch record not found.");
  }

  if (dispatch.driverId !== driverUserId) {
    throw new AppError(403, "You are not assigned to this dispatch.");
  }

  if (dispatch.status !== "PENDING") {
    throw new AppError(400, `Cannot accept dispatch that is in '${dispatch.status}' state.`);
  }

  return await db.transaction(async (tx) => {
    const updatedDispatch = await tx.orm.public.Dispatch
      .where((d) => d.id.eq(dispatchId))
      .update({
        status: "ACCEPTED",
        acceptedAt: nowInstant(),
        updatedAt: new Date().toISOString(),
      });

    await tx.orm.public.Emergency
      .where((e) => e.id.eq(dispatch.emergencyId))
      .update({
        status: "ACCEPTED",
        updatedAt: new Date().toISOString(),
      });

    return updatedDispatch;
  });
};

const rejectDispatchIntoDB = async (
  dispatchId: string,
  driverUserId: string,
  reason?: string,
) => {
  const dispatch = await db.orm.public.Dispatch
    .where((d) => d.id.eq(dispatchId))
    .first();

  if (!dispatch) {
    throw new AppError(404, "Dispatch record not found.");
  }

  if (dispatch.driverId !== driverUserId) {
    throw new AppError(403, "You are not assigned to this dispatch.");
  }

  if (dispatch.status !== "PENDING") {
    throw new AppError(400, `Cannot reject dispatch that is in '${dispatch.status}' state.`);
  }

  return await db.transaction(async (tx) => {
    // 1. Mark dispatch as REJECTED
    const updatedDispatch = await tx.orm.public.Dispatch
      .where((d) => d.id.eq(dispatchId))
      .update({
        status: "REJECTED",
        cancellationReason: reason ?? "Rejected by driver",
        cancelledAt: nowInstant(),
        updatedAt: new Date().toISOString(),
      });

    // 2. Release ambulance back to AVAILABLE
    await tx.orm.public.Ambulance
      .where((a) => a.id.eq(dispatch.ambulanceId))
      .update({
        status: "AVAILABLE",
        updatedAt: new Date().toISOString(),
      });

    // 3. Set emergency status back to SEARCHING so another ambulance can be dispatched
    await tx.orm.public.Emergency
      .where((e) => e.id.eq(dispatch.emergencyId))
      .update({
        status: "SEARCHING",
        updatedAt: new Date().toISOString(),
      });

    return updatedDispatch;
  });
};

const updateDispatchStatusIntoDB = async (
  dispatchId: string,
  driverUserId: string,
  newStatus: "ACCEPTED" | "EN_ROUTE" | "ARRIVED" | "PICKED_UP" | "AT_HOSPITAL" | "COMPLETED",
) => {
  const dispatch = await db.orm.public.Dispatch
    .where((d) => d.id.eq(dispatchId))
    .first();

  if (!dispatch) {
    throw new AppError(404, "Dispatch record not found.");
  }

  if (dispatch.driverId !== driverUserId) {
    throw new AppError(403, "You are not the assigned driver for this dispatch.");
  }

  // Validate state machine progression
  const allowedNext = VALID_TRANSITIONS[dispatch.status] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new AppError(
      400,
      `Invalid status transition: Cannot move from '${dispatch.status}' to '${newStatus}'. Allowed: [${allowedNext.join(", ")}]`,
    );
  }

  return await db.transaction(async (tx) => {
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === "ACCEPTED") updateData.acceptedAt = nowInstant();
    if (newStatus === "EN_ROUTE") updateData.enRouteAt = nowInstant();
    if (newStatus === "ARRIVED") updateData.arrivedAt = nowInstant();
    if (newStatus === "PICKED_UP") updateData.pickedUpAt = nowInstant();
    if (newStatus === "AT_HOSPITAL") updateData.atHospitalAt = nowInstant();
    if (newStatus === "COMPLETED") updateData.completedAt = nowInstant();

    const updatedDispatch = await tx.orm.public.Dispatch
      .where((d) => d.id.eq(dispatchId))
      .update(updateData);

    const emergency = await tx.orm.public.Emergency
      .where((e) => e.id.eq(dispatch.emergencyId))
      .first();

    // Mirror status to Emergency
    const emergencyUpdateData: any = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    // When trip completes:
    // 1. Release ambulance to AVAILABLE
    // 2. Release driver to AVAILABLE
    // 3. Finalize emergency fare
    if (newStatus === "COMPLETED") {
      await tx.orm.public.Ambulance
        .where((a) => a.id.eq(dispatch.ambulanceId))
        .update({
          status: "AVAILABLE",
          updatedAt: new Date().toISOString(),
        });

      const driverProfile = await tx.orm.public.DriverProfile
        .where((dp) => dp.userId.eq(driverUserId))
        .first();

      if (driverProfile) {
        await tx.orm.public.DriverProfile
          .where((dp) => dp.id.eq(driverProfile.id))
          .update({
            isAvailable: true,
            updatedAt: new Date().toISOString(),
          });
      }

      emergencyUpdateData.finalFare = emergency?.estimatedFare ?? null;

      await logAudit({
        userId: driverUserId,
        action: "DISPATCH_COMPLETED",
        entity: "Dispatch",
        entityId: dispatchId,
        details: {
          emergencyId: dispatch.emergencyId,
          ambulanceId: dispatch.ambulanceId,
          finalFare: emergencyUpdateData.finalFare,
        },
      });
    }

    await tx.orm.public.Emergency
      .where((e) => e.id.eq(dispatch.emergencyId))
      .update(emergencyUpdateData);

    return updatedDispatch;
  });
};

export const DispatchService = {
  getMyDispatchesFromDB,
  getDispatchByIdFromDB,
  acceptDispatchIntoDB,
  rejectDispatchIntoDB,
  updateDispatchStatusIntoDB,
};
