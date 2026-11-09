const apiBase = import.meta.env.DEV ? "http://127.0.0.1:4000/api" : "/api";

export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    if (data.error) throw new Error(data.error);
    const detail = text
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    throw new Error(
      `Request failed (HTTP ${response.status})${detail ? `: ${detail}` : "."}`,
    );
  }

  return data;
}
