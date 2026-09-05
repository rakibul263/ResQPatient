import { db } from "../../prisma/db.js";
import { AppError } from "../../utils/AppError.js";
import { calculateFare } from "../../utils/fareCalculator.js";
import { calculateHaversineDistance } from "../../utils/geo.js";
import { logAudit } from "../../utils/auditLogger.js";
import { nowInstant } from "../../utils/temporal.js";

interface CreateEmergencyPayload {
  hospitalId: string;
  pickupLocation: string;
  pickupLat: number;
  pickupLng: number;
  ambulanceType: "ICU" | "OXYGEN" | "BASIC";
  urgencyLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  notes?: string;
}

const createEmergencyIntoDB = async (
  patientUserId: string,
  payload: CreateEmergencyPayload,
  ipAddress?: string,
  userAgent?: string,
) => {
  const hospital = await db.orm.public.Hospital
    .where((h) => h.id.eq(payload.hospitalId))
    .where((h) => h.deletedAt.isNull())
    .first();

  if (!hospital) {
    throw new AppError(404, "Designated hospital not found.");
  }

  if (!hospital.isAvailable) {
    throw new AppError(400, "Selected hospital is currently not accepting emergency admissions.");
  }

  const urgency = payload.urgencyLevel ?? "MEDIUM";
  const fareBreakdown = calculateFare(
    payload.pickupLat,
    payload.pickupLng,
    hospital.lat,
    hospital.lng,
    payload.ambulanceType,
    urgency,
  );

  return await db.transaction(async (tx) => {
    // 1. Create the Emergency record
    const emergency = await tx.orm.public.Emergency.create({
      patientId: patientUserId,
      hospitalId: hospital.id,
      pickupLocation: payload.pickupLocation,
      pickupLat: payload.pickupLat,
      pickupLng: payload.pickupLng,
      ambulanceType: payload.ambulanceType,
      urgencyLevel: urgency,
      status: "REQUESTED",
      notes: payload.notes ?? null,
      estimatedFare: fareBreakdown.totalFare,
      finalFare: null,
      cancellationReason: null,
      cancelledAt: null,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    });

    // 2. Query suitable available ambulances of requested type
    const availableAmbulances = await tx.orm.public.Ambulance
      .where((a) => a.deletedAt.isNull())
      .where((a) => a.status.eq("AVAILABLE"))
      .where((a) => a.vehicleType.eq(payload.ambulanceType))
      .all();

    let candidateAmbulances: Array<{
      ambulance: typeof availableAmbulances[0];
      distanceKm: number;
      driverId: string;
    }> = [];

    for (const amb of availableAmbulances) {
      if (!amb.driverId) continue;

      const driverProfile = await tx.orm.public.DriverProfile
        .where((dp) => dp.userId.eq(amb.driverId!))
        .where((dp) => dp.deletedAt.isNull())
        .first();

      // Only dispatch verified and currently available drivers
      if (driverProfile && driverProfile.isVerified && driverProfile.isAvailable) {
        let dist = 9999;
        if (amb.currentLat !== null && amb.currentLng !== null) {
          dist = calculateHaversineDistance(
            payload.pickupLat,
            payload.pickupLng,
            amb.currentLat,
            amb.currentLng,
          );
        }
        candidateAmbulances.push({
          ambulance: amb,
          distanceKm: dist,
          driverId: amb.driverId!,
        });
      }
    }

    // Sort by proximity: nearest ambulance first
    candidateAmbulances.sort((a, b) => a.distanceKm - b.distanceKm);

    let assignedDispatch = null;

    if (candidateAmbulances.length > 0) {
      const selected = candidateAmbulances[0]!;

      // 3. Atomically reserve ambulance to BUSY
      await tx.orm.public.Ambulance
        .where((a) => a.id.eq(selected.ambulance.id))
        .update({
          status: "BUSY",
          updatedAt: new Date().toISOString(),
        });

      // 4. Create Dispatch record
      assignedDispatch = await tx.orm.public.Dispatch.create({
        emergencyId: emergency.id,
        ambulanceId: selected.ambulance.id,
        driverId: selected.driverId,
        status: "PENDING",
        assignedAt: nowInstant(),
        acceptedAt: null,
        enRouteAt: null,
        arrivedAt: null,
        pickedUpAt: null,
        atHospitalAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: nowInstant(),
        updatedAt: new Date().toISOString(),
      });

      // 5. Update emergency status to ASSIGNED
      await tx.orm.public.Emergency
        .where((e) => e.id.eq(emergency.id))
        .update({
          status: "ASSIGNED",
          updatedAt: new Date().toISOString(),
        });

      await logAudit({
        userId: patientUserId,
        action: "DISPATCH_CREATED",
        entity: "Dispatch",
        entityId: assignedDispatch.id,
        details: {
          emergencyId: emergency.id,
          ambulanceId: selected.ambulance.id,
          driverId: selected.driverId,
        },
        ipAddress,
        userAgent,
      });
    } else {
      // If no ambulance was available immediately, transition to SEARCHING
      await tx.orm.public.Emergency
        .where((e) => e.id.eq(emergency.id))
        .update({
          status: "SEARCHING",
          updatedAt: new Date().toISOString(),
        });
    }

    await logAudit({
      userId: patientUserId,
      action: "EMERGENCY_CREATED",
      entity: "Emergency",
      entityId: emergency.id,
      details: {
        pickupLocation: emergency.pickupLocation,
        hospitalId: hospital.id,
        estimatedFare: emergency.estimatedFare,
        dispatched: !!assignedDispatch,
      },
      ipAddress,
      userAgent,
    });

    const refreshed = await tx.orm.public.Emergency
      .where((e) => e.id.eq(emergency.id))
      .first();

    return {
      ...refreshed,
      hospital: {
        id: hospital.id,
        name: hospital.name,
        address: hospital.address,
        contactNumber: hospital.contactNumber,
      },
      fareBreakdown,
      dispatch: assignedDispatch,
    };
  });
};

const cancelEmergencyIntoDB = async (
  emergencyId: string,
  user: { id: string; role: string },
  reason?: string,
) => {
  const emergency = await db.orm.public.Emergency
    .where((e) => e.id.eq(emergencyId))
    .where((e) => e.deletedAt.isNull())
    .first();

  if (!emergency) {
    throw new AppError(404, "Emergency request not found.");
  }

  // Strict ownership check: only patient or admin can cancel
  if (user.role !== "ADMIN" && emergency.patientId !== user.id) {
    throw new AppError(403, "You do not have permission to cancel this emergency.");
  }

  if (emergency.status === "CANCELLED") {
    throw new AppError(400, "This emergency is already cancelled.");
  }

  // Strict state machine guard: Cancellation allowed ONLY before EN_ROUTE
  const nonCancellableStatuses = [
    "EN_ROUTE",
    "ARRIVED",
    "PICKED_UP",
    "AT_HOSPITAL",
    "COMPLETED",
  ];

  if (nonCancellableStatuses.includes(emergency.status)) {
    throw new AppError(
      400,
      `Cannot cancel emergency once ambulance is ${emergency.status}. Cancellation is only permitted before EN_ROUTE.`,
    );
  }

  return await db.transaction(async (tx) => {
    // Cancel the emergency
    await tx.orm.public.Emergency
      .where((e) => e.id.eq(emergencyId))
      .update({
        status: "CANCELLED",
        cancellationReason: reason ?? "Cancelled by user",
        cancelledAt: nowInstant(),
        updatedAt: new Date().toISOString(),
      });

    // Check if there is an active dispatch to cancel and release ambulance
    const dispatch = await tx.orm.public.Dispatch
      .where((d) => d.emergencyId.eq(emergencyId))
      .first();

    if (dispatch && dispatch.status !== "CANCELLED" && dispatch.status !== "COMPLETED") {
      await tx.orm.public.Dispatch
        .where((d) => d.id.eq(dispatch.id))
        .update({
          status: "CANCELLED",
          cancellationReason: reason ?? "Emergency cancelled by user",
          cancelledAt: nowInstant(),
          updatedAt: new Date().toISOString(),
        });

      // Release ambulance back to AVAILABLE
      await tx.orm.public.Ambulance
        .where((a) => a.id.eq(dispatch.ambulanceId))
        .update({
          status: "AVAILABLE",
          updatedAt: new Date().toISOString(),
        });

      // Ensure driver is AVAILABLE
      const driverProfile = await tx.orm.public.DriverProfile
        .where((dp) => dp.userId.eq(dispatch.driverId))
        .first();

      if (driverProfile) {
        await tx.orm.public.DriverProfile
          .where((dp) => dp.id.eq(driverProfile.id))
          .update({
            isAvailable: true,
            updatedAt: new Date().toISOString(),
          });
      }
    }

    await logAudit({
      userId: user.id,
      action: "EMERGENCY_CANCELLED",
      entity: "Emergency",
      entityId: emergencyId,
      details: { reason },
    });

    const updated = await tx.orm.public.Emergency
      .where((e) => e.id.eq(emergencyId))
      .first();

    return updated;
  });
};

const getMyEmergenciesFromDB = async (
  patientUserId: string,
  query: any,
) => {
  const { page = 1, limit = 10, status } = query;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  let queryBuilder = db.orm.public.Emergency
    .where((e) => e.patientId.eq(patientUserId))
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
    .where((e) => e.patientId.eq(patientUserId))
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

const getEmergencyByIdFromDB = async (
  emergencyId: string,
  user: { id: string; role: string },
) => {
  const emergency = await db.orm.public.Emergency
    .where((e) => e.id.eq(emergencyId))
    .where((e) => e.deletedAt.isNull())
    .first();

  if (!emergency) {
    throw new AppError(404, "Emergency record not found.");
  }

  const dispatch = await db.orm.public.Dispatch
    .where((d) => d.emergencyId.eq(emergencyId))
    .first();

  // Authorization check: patient who requested, or driver assigned, or admin
  const isPatient = emergency.patientId === user.id;
  const isDriver = dispatch && dispatch.driverId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isPatient && !isDriver && !isAdmin) {
    throw new AppError(403, "You do not have permission to view this emergency record.");
  }

  const hospital = await db.orm.public.Hospital
    .where((h) => h.id.eq(emergency.hospitalId))
    .first();

  let ambulance = null;
  if (dispatch) {
    ambulance = await db.orm.public.Ambulance
      .where((a) => a.id.eq(dispatch.ambulanceId))
      .first();
  }

  return {
    ...emergency,
    hospital: hospital || null,
    dispatch: dispatch
      ? {
          ...dispatch,
          ambulance: ambulance || null,
        }
      : null,
  };
};

const getAllEmergenciesFromDB = async (query: any) => {
  const { page = 1, limit = 10, status, urgencyLevel } = query;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  let queryBuilder = db.orm.public.Emergency
    .where((e) => e.deletedAt.isNull());

  if (status) {
    queryBuilder = queryBuilder.where((e) => e.status.eq(status));
  }
  if (urgencyLevel) {
    queryBuilder = queryBuilder.where((e) => e.urgencyLevel.eq(urgencyLevel));
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

export const EmergencyService = {
  createEmergencyIntoDB,
  cancelEmergencyIntoDB,
  getMyEmergenciesFromDB,
  getEmergencyByIdFromDB,
  getAllEmergenciesFromDB,
};
