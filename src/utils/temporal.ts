import { Temporal } from "@js-temporal/polyfill";

/**
 * Returns the current instant as a Temporal.Instant (required by Prisma 8 RC for DateTime fields)
 */
export const nowInstant = (): any => {
  return Temporal.Now.instant();
};

/**
 * Returns a Temporal.Instant from epoch milliseconds
 */
export const instantFromEpochMs = (ms: number): any => {
  return Temporal.Instant.fromEpochMilliseconds(ms);
};

/**
 * Returns a Temporal.Instant from a JS Date
 */
export const instantFromDate = (date: Date): any => {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
};

/**
 * Returns a future Temporal.Instant offset by the specified number of days
 */
export const instantDaysFromNow = (days: number): any => {
  return Temporal.Instant.fromEpochMilliseconds(Date.now() + days * 24 * 60 * 60 * 1000);
};

export { Temporal };
