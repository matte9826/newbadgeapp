// GPS check for clock-in. The server compares the phone's reported position to
// the site coordinates using the haversine distance and the site's tolerance
// radius. Verification happens ONLY on clock-in — never continuous tracking.

const R = 6371000; // Earth radius, metres

/** Great-circle distance in metres between two lat/lng points. */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** True if the point is within the site radius (metres). */
export function withinRadius(siteLat, siteLng, radiusM, lat, lng) {
  return distanceMeters(siteLat, siteLng, lat, lng) <= radiusM;
}
