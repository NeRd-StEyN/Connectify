import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import axios from "axios";

export const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/verify-token`, {
          withCredentials: true,
        });

        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };

    verifyToken();
  }, []);

  if (isAuthenticated === null) return <div>Loading...</div>;

  // ✅ Redirect to /myself if logged in and visiting "/"
  if (isAuthenticated && location.pathname === "/") {
    return <Navigate to="/myself" replace />;
  }

  // ❌ Redirect to "/" (login) if not authenticated
  if (!isAuthenticated && location.pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
};
