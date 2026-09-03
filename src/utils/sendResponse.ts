import type { Response } from "express";

export interface IMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  meta?: IMeta;
  data?: T;
}

export const sendResponse = <T>(res: Response, data: IApiResponse<T>) => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    ...(data.meta ? { meta: data.meta } : {}),
    data: data.data !== undefined ? data.data : null,
  });
};

export default sendResponse;
