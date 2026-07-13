// All time reasoning is anchored to the SERVER clock and the Italy timezone,
// with daylight saving handled automatically by luxon. Timestamps are stored
// as UTC ISO strings (millisecond precision); day/month/year views are derived
// from these at read time, so no calendar needs to be pre-loaded.
import { DateTime } from "luxon";

export const ZONE = "Europe/Rome";

/** Current server instant as a UTC ISO string. */
export function nowIso() {
  return DateTime.utc().toISO();
}

/** Parse a stored ISO string into a luxon DateTime in Rome time. */
export function toRome(iso) {
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(ZONE);
}

/** Seconds between two ISO instants (exit - entry), never negative. */
export function secondsBetween(startIso, endIso) {
  const s = DateTime.fromISO(startIso, { zone: "utc" });
  const e = DateTime.fromISO(endIso, { zone: "utc" });
  return Math.max(0, Math.round(e.diff(s, "seconds").seconds));
}

/** Rome-local calendar date (YYYY-MM-DD) for an ISO instant. */
export function romeDate(iso) {
  return toRome(iso).toFormat("yyyy-MM-dd");
}

/** UTC ISO bounds [start, end) for a Rome-local calendar day (YYYY-MM-DD). */
export function dayBoundsUtc(dateStr) {
  const start = DateTime.fromISO(dateStr, { zone: ZONE }).startOf("day");
  const end = start.plus({ days: 1 });
  return { startIso: start.toUTC().toISO(), endIso: end.toUTC().toISO() };
}

/** UTC ISO bounds [start, end) for a Rome-local month containing `ref` (ISO). */
export function monthBoundsUtc(refIso = nowIso()) {
  const ref = DateTime.fromISO(refIso, { zone: "utc" }).setZone(ZONE);
  const start = ref.startOf("month");
  const end = start.plus({ months: 1 });
  return { startIso: start.toUTC().toISO(), endIso: end.toUTC().toISO() };
}

/** UTC ISO bounds [start, end) covering a Rome-local date range, inclusive. */
export function rangeBoundsUtc(fromStr, toStr) {
  const start = DateTime.fromISO(fromStr, { zone: ZONE }).startOf("day");
  const end = DateTime.fromISO(toStr, { zone: ZONE }).startOf("day").plus({ days: 1 });
  return { startIso: start.toUTC().toISO(), endIso: end.toUTC().toISO() };
}

/** Human Rome-time clock (HH:mm) for an ISO instant. */
export function romeClock(iso) {
  return iso ? toRome(iso).toFormat("HH:mm") : "";
}

/** Human Rome-time clock with seconds (HH:mm:ss). */
export function romeClockSeconds(iso) {
  return iso ? toRome(iso).toFormat("HH:mm:ss") : "";
}

/** Today's Rome-local date string. */
export function todayRome() {
  return DateTime.now().setZone(ZONE).toFormat("yyyy-MM-dd");
}
