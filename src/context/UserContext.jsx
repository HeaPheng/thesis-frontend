import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import api from "../lib/api";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Prevent parallel /me calls
  const loadingRef = useRef(false);

  /**
   * Fetch authenticated user
   */
  const refreshUser = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const { data } = await api.get("/auth/me");
      setUser(data?.user || data || null);
    } catch (error) {
      if (error?.response?.status === 401) {
        setUser(null);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  /**
   * Logout (SINGLE SOURCE OF TRUTH)
   */
  const logout = useCallback(async () => {
    try {
      // await api.post("/logout");
    } catch {
      // ignore
    }

    // 🔥 Clear auth everywhere
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");

    // 🔥 Remove Authorization header
    delete api.defaults.headers.common["Authorization"];

    // 🔥 Update React state
    setUser(null);
    setLoading(false);

    // ✅ Tell the whole app immediately (MainLayout listens to this)
    window.dispatchEvent(new Event("auth-changed"));
  }, []);

  /**
   * Initial auth check on app load
   */
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    refreshUser();
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
