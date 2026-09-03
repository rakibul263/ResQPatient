import type { JwtPayload } from "jsonwebtoken";

export interface IAuthUser {
  id: string;
  email: string;
  role: "PATIENT" | "DRIVER" | "ADMIN";
}

declare global {
  namespace Express {
    interface Request {
      user?: IAuthUser & JwtPayload;
    }
  }
}
