import bcrypt from "bcrypt";
import { db } from "../../prisma/db.js";
import { AppError } from "../../utils/AppError.js";

const getMyProfileFromDB = async (userId: string) => {
  const user = await db.orm.public.User
    .where((u) => u.id.eq(userId))
    .where((u) => u.deletedAt.isNull())
    .first();

  if (!user) {
    throw new AppError(404, "User profile not found.");
  }

  let driverProfile = null;
  if (user.role === "DRIVER") {
    driverProfile = await db.orm.public.DriverProfile
      .where((dp) => dp.userId.eq(userId))
      .where((dp) => dp.deletedAt.isNull())
      .first();
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    isSuspended: user.isSuspended,
    createdAt: user.createdAt,
    driverProfile,
  };
};

const updateMyProfileIntoDB = async (
  userId: string,
  payload: { name?: string; phone?: string },
) => {
  const user = await db.orm.public.User
    .where((u) => u.id.eq(userId))
    .where((u) => u.deletedAt.isNull())
    .first();

  if (!user) {
    throw new AppError(404, "User not found.");
  }

  const updateData: { name?: string; phone?: string; updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  };
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.phone !== undefined) updateData.phone = payload.phone;

  await db.orm.public.User
    .where((u) => u.id.eq(userId))
    .update(updateData);

  return await getMyProfileFromDB(userId);
};

const changePasswordIntoDB = async (
  userId: string,
  payload: { oldPassword: string; newPassword: string },
) => {
  const user = await db.orm.public.User
    .where((u) => u.id.eq(userId))
    .where((u) => u.deletedAt.isNull())
    .first();

  if (!user) {
    throw new AppError(404, "User not found.");
  }

  const isPasswordMatched = await bcrypt.compare(payload.oldPassword, user.password);
  if (!isPasswordMatched) {
    throw new AppError(400, "Current password does not match.");
  }

  const hashedPassword = await bcrypt.hash(payload.newPassword, 10);

  await db.orm.public.User
    .where((u) => u.id.eq(userId))
    .update({
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    });

  return { message: "Password updated successfully." };
};

export const UserService = {
  getMyProfileFromDB,
  updateMyProfileIntoDB,
  changePasswordIntoDB,
};
