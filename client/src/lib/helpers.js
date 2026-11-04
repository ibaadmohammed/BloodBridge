export const CITY_COORDS = {
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Delhi: { lat: 28.7041, lng: 77.1025 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
};

export const CITIES = Object.keys(CITY_COORDS);

export const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
