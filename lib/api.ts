export async function apiRequest(method: string, url: string, data?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const errorText = await res.text();
    try {
        const json = JSON.parse(errorText);
        throw new Error(json.message || getattr(json, 'error') || errorText);
    } catch {
        throw new Error(errorText);
    }
  }
  return res;
}

// Fallback for getattr kind of
function getattr(obj: any, key: string) {
    return obj[key];
}
