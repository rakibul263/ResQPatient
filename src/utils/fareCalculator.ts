import { calculateHaversineDistance } from "./geo.js";

export interface IFareBreakdown {
  baseFare: number;
  distanceKm: number;
  distanceFare: number;
  emergencyFee: number;
  ambulanceTypeFee: number;
  totalFare: number;
}

export const calculateFare = (
  pickupLat: number,
  pickupLng: number,
  hospitalLat: number,
  hospitalLng: number,
  ambulanceType: "ICU" | "OXYGEN" | "BASIC",
  urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
): IFareBreakdown => {
  const BASE_FARE = 50.0;
  const RATE_PER_KM = 5.0;

  const distanceKm = calculateHaversineDistance(
    pickupLat,
    pickupLng,
    hospitalLat,
    hospitalLng,
  );

  const distanceFare = Math.round(distanceKm * RATE_PER_KM * 100) / 100;

  let emergencyFee = 0.0;
  switch (urgencyLevel) {
    case "CRITICAL":
      emergencyFee = 40.0;
      break;
    case "HIGH":
      emergencyFee = 25.0;
      break;
    case "MEDIUM":
      emergencyFee = 15.0;
      break;
    case "LOW":
    default:
      emergencyFee = 0.0;
      break;
  }

  let ambulanceTypeFee = 0.0;
  switch (ambulanceType) {
    case "ICU":
      ambulanceTypeFee = 80.0;
      break;
    case "OXYGEN":
      ambulanceTypeFee = 40.0;
      break;
    case "BASIC":
    default:
      ambulanceTypeFee = 15.0;
      break;
  }

  const totalFare = Math.round(
    (BASE_FARE + distanceFare + emergencyFee + ambulanceTypeFee) * 100,
  ) / 100;

  return {
    baseFare: BASE_FARE,
    distanceKm,
    distanceFare,
    emergencyFee,
    ambulanceTypeFee,
    totalFare,
  };
};

export default calculateFare;
