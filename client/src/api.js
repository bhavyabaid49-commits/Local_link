const apiBase = import.meta.env.DEV ? "http://127.0.0.1:4000/api" : "/api";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
