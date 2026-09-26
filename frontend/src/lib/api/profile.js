const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function saveOnboarding(payload) {
  const res = await fetch(`${BASE_URL}/users/me/onboarding`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const error = new Error(data?.message || "Something went wrong");
    error.status = res.status;
    error.code = data?.code;
    throw error;
  }

  return data;
}