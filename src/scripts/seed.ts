import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "../prisma/db.js";

async function seed() {
  console.log("🌱 Starting ResQPatient Database Seeding...");

  // 1. Seed Admin
  const adminEmail = "admin@resqpatient.com";
  let admin = await db.orm.public.User
    .where((u) => u.email.eq(adminEmail))
    .first();

  if (!admin) {
    const hashedPassword = await bcrypt.hash("Admin@12345", 10);
    admin = await db.orm.public.User.create({
      name: "Super Admin",
      email: adminEmail,
      password: hashedPassword,
      phone: "+1-800-RESQ-ADMIN",
      role: "ADMIN",
      isVerified: true,
      isSuspended: false,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ Admin seeded: ${adminEmail} (Password: Admin@12345 - DEMO ONLY)`);
  } else {
    console.log(`ℹ️ Admin already exists: ${adminEmail}`);
  }

  // 2. Seed 3 Patients
  const patientsData = [
    { name: "John Doe", email: "patient1@resqpatient.com", phone: "+1-555-0101" },
    { name: "Jane Smith", email: "patient2@resqpatient.com", phone: "+1-555-0102" },
    { name: "Robert Johnson", email: "patient3@resqpatient.com", phone: "+1-555-0103" },
  ];

  const patientPassword = await bcrypt.hash("Patient@12345", 10);
  for (const p of patientsData) {
    let patient = await db.orm.public.User
      .where((u) => u.email.eq(p.email))
      .first();

    if (!patient) {
      patient = await db.orm.public.User.create({
        name: p.name,
        email: p.email,
        password: patientPassword,
        phone: p.phone,
        role: "PATIENT",
        isVerified: true,
        isSuspended: false,
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Patient seeded: ${p.email} (Password: Patient@12345)`);
    } else {
      console.log(`ℹ️ Patient already exists: ${p.email}`);
    }
  }

  // 3. Seed 3 Drivers + DriverProfiles
  const driversData = [
    { name: "Michael Davis", email: "driver1@resqpatient.com", phone: "+1-555-0201", license: "DL-NYC-1001", exp: 5 },
    { name: "Sarah Wilson", email: "driver2@resqpatient.com", phone: "+1-555-0202", license: "DL-NYC-1002", exp: 3 },
    { name: "David Brown", email: "driver3@resqpatient.com", phone: "+1-555-0203", license: "DL-NYC-1003", exp: 7 },
  ];

  const driverPassword = await bcrypt.hash("Driver@12345", 10);
  const seededDriverUsers: string[] = [];

  for (const d of driversData) {
    let driverUser = await db.orm.public.User
      .where((u) => u.email.eq(d.email))
      .first();

    if (!driverUser) {
      driverUser = await db.orm.public.User.create({
        name: d.name,
        email: d.email,
        password: driverPassword,
        phone: d.phone,
        role: "DRIVER",
        isVerified: true,
        isSuspended: false,
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Driver user seeded: ${d.email} (Password: Driver@12345)`);
    } else {
      console.log(`ℹ️ Driver user already exists: ${d.email}`);
    }

    seededDriverUsers.push(driverUser.id);

    const profile = await db.orm.public.DriverProfile
      .where((dp) => dp.userId.eq(driverUser!.id))
      .first();

    if (!profile) {
      await db.orm.public.DriverProfile.create({
        userId: driverUser.id,
        licenseNumber: d.license,
        experienceYears: d.exp,
        isVerified: true,
        isAvailable: true,
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Driver profile seeded for: ${d.email}`);
    }
  }

  // 4. Seed 4 Ambulances
  const ambulancesData = [
    {
      vehicleNumber: "AMB-ICU-101",
      vehicleType: "ICU" as const,
      driverId: seededDriverUsers[0],
      currentLat: 40.7128,
      currentLng: -74.0060,
    },
    {
      vehicleNumber: "AMB-OXY-201",
      vehicleType: "OXYGEN" as const,
      driverId: seededDriverUsers[1],
      currentLat: 40.7282,
      currentLng: -73.9942,
    },
    {
      vehicleNumber: "AMB-BAS-301",
      vehicleType: "BASIC" as const,
      driverId: seededDriverUsers[2],
      currentLat: 40.7484,
      currentLng: -73.9857,
    },
    {
      vehicleNumber: "AMB-ICU-102",
      vehicleType: "ICU" as const,
      driverId: null,
      currentLat: 40.7589,
      currentLng: -73.9851,
    },
  ];

  for (const amb of ambulancesData) {
    const existingAmb = await db.orm.public.Ambulance
      .where((a) => a.vehicleNumber.eq(amb.vehicleNumber))
      .first();

    if (!existingAmb) {
      await db.orm.public.Ambulance.create({
        driverId: amb.driverId ?? null,
        vehicleNumber: amb.vehicleNumber,
        vehicleType: amb.vehicleType,
        status: "AVAILABLE",
        currentLat: amb.currentLat,
        currentLng: amb.currentLng,
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Ambulance seeded: ${amb.vehicleNumber} (${amb.vehicleType})`);
    } else {
      console.log(`ℹ️ Ambulance already exists: ${amb.vehicleNumber}`);
    }
  }

  // 5. Seed 3 Hospitals
  const hospitalsData = [
    {
      name: "Metropolitan General Hospital",
      address: "100 1st Ave, New York, NY 10003",
      contactNumber: "+1-212-555-0301",
      lat: 40.7306,
      lng: -73.9352,
      capacity: 250,
      availableBeds: 45,
    },
    {
      name: "City Heart & Trauma Center",
      address: "450 E 29th St, New York, NY 10016",
      contactNumber: "+1-212-555-0302",
      lat: 40.7488,
      lng: -73.9680,
      capacity: 300,
      availableBeds: 60,
    },
    {
      name: "St. Jude Children's & Emergency Care",
      address: "1230 York Ave, New York, NY 10065",
      contactNumber: "+1-212-555-0303",
      lat: 40.7614,
      lng: -73.9776,
      capacity: 150,
      availableBeds: 25,
    },
  ];

  for (const h of hospitalsData) {
    const existingHospital = await db.orm.public.Hospital
      .where((hosp) => hosp.name.eq(h.name))
      .first();

    if (!existingHospital) {
      await db.orm.public.Hospital.create({
        name: h.name,
        address: h.address,
        contactNumber: h.contactNumber,
        lat: h.lat,
        lng: h.lng,
        capacity: h.capacity,
        availableBeds: h.availableBeds,
        isAvailable: true,
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Hospital seeded: ${h.name}`);
    } else {
      console.log(`ℹ️ Hospital already exists: ${h.name}`);
    }
  }

  console.log("🎉 Database seeding completed successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
