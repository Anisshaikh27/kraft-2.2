export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// Returns auth headers for axios requests
export function getAuthHeaders(token: string | null): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
