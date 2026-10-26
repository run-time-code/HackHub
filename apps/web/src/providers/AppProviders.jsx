import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { queryClient } from "../lib/queryClient";
import { trackPageView } from "../lib/analytics";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";
import { ConsentProvider, useConsent } from "./ConsentProvider";

function RouteAnalytics() {
  const location = useLocation();
  const { analytics } = useConsent();

  useEffect(() => {
    if (!analytics) return;
    trackPageView(`${location.pathname}${location.search ? "?search" : ""}`);
  }, [location.pathname, location.search, analytics]);

  return null;
}

function QuerySessionBoundary({ children }) {
  useEffect(() => {
    function handleUnauthorized() {
      queryClient.clear();
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  return children;
}

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <ConsentProvider>
            <AuthProvider>
              <QuerySessionBoundary>
                <RouteAnalytics />
                {children}
              </QuerySessionBoundary>
            </AuthProvider>
          </ConsentProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
