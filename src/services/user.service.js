import api from "./api";

export async function listUsers() {
  const { data } = await api.get("/users");
  return data;
}

export async function createUser(user) {
  const { data } = await api.post("/users", user);
  return data;
}
