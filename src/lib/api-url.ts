/**
 * API URL Helper for Capacitor APK
 * 
 * In the APK, the app is a static site loaded from local files.
 * API calls need to go to the Space-Z backend server.
 * In development, relative URLs work fine.
 */

// The backend server URL - this is where the Next.js API routes run
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Get the full API URL for a given path
 * In the APK: prepends the Space-Z backend URL
 * In development: returns the relative path as-is
 */
export function apiUrl(path: string): string {
  // If the path is already a full URL, return it as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Prepend the API base URL
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`;
  }
  
  // In development, just use the relative path
  return path;
}

/**
 * Fetch wrapper that automatically uses the correct API URL
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  
  // Add credentials for same-origin requests in dev
  const finalOptions: RequestInit = {
    ...options,
    credentials: API_BASE_URL ? 'include' : 'same-origin',
    headers: {
      ...options?.headers,
    },
  };
  
  return fetch(url, finalOptions);
}

export default apiUrl;
