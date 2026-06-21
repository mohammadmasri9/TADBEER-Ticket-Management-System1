import api from "./api";

export async function login(email: string, password: string) {
  const res = await api.post("/api/auth/login", { email, password });
  return res.data; // { token, user }
}

export async function me() {
  const res = await api.get("/api/auth/me");
  return res.data; // { user }
}
