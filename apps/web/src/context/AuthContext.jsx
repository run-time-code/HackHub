import { useState, useEffect, useCallback } from "react";
import { getCurrentUser, logoutUser as logoutApi } from "../lib/api/auth";
import { setAccessToken } from "../lib/api/client";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true while we check for an existing session
  const [authError, setAuthError] = useState(null);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const data = await getCurrentUser();
      setUser(data?.user || data);
    } catch (error) {
      setUser(null);
      if (error.status !== 401) setAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getCurrentUser()
      .then((data) => {
        if (isMounted) setUser(data?.user || data);
      })
      .catch((error) => {
        if (!isMounted) return;
        setUser(null);
        if (error.status !== 401) setAuthError(error);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    function handleUnauthorized() {
      setUser(null);
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  function login(userData) {
    setUser(userData?.user || userData);
    setAuthError(null);
  }

  function updateUser(partial) {
    setUser((current) => (current ? { ...current, ...partial } : current));
  }

  async function logout() {
    try {
      await logoutApi();
    } catch (error) {
      setAccessToken(null);
      if (error.status !== 401) {
        setAuthError(new Error(`The server did not confirm logout: ${error.message}`));
      }
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        authError,
        clearAuthError: () => setAuthError(null),
        refreshSession,
        login,
        updateUser,
        logout,
      }}
    >
      {authError && (
        <div className="session-alert" role="alert">
          <span>Authentication needs attention: {authError.message}</span>
          <button type="button" onClick={refreshSession}>Retry</button>
          <button type="button" onClick={() => setAuthError(null)} aria-label="Dismiss session error">Dismiss</button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}
