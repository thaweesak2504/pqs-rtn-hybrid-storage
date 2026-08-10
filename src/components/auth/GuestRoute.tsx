import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import SessionLoadingState from "./SessionLoadingState";

/**
 * Routes intended only for signed-out users. A restored session must never
 * leave the authenticated shell displaying the sign-in/registration page.
 */
const GuestRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SessionLoadingState />;
  }

  if (isAuthenticated && user) {
    return <Navigate to="/welcome" replace />;
  }

  return <Outlet />;
};

export default GuestRoute;
