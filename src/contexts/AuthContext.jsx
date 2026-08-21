import { createContext, useContext, useState } from "react";
import * as authService from "../services/auth.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  async function login(email, password) {
    const { token, user: loggedUser } = await authService.login(email, password);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
