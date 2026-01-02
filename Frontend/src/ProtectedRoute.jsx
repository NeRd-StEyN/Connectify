import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";
import { Spinner } from "./Spinner.jsx";
export const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null means loading

  useEffect(() => {
    const verifyToken = async () => {
      const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
      try {
        const res = await axios.get(`${BASE_URL}/verify-token`, {
          withCredentials: true, // Send cookies
        });

        console.log("Verified user:", res.data.user);
        setIsAuthenticated(true);
      } catch (err) {
        console.warn("Auth check failed:", err.response?.data || err.message);
        setIsAuthenticated(false);
      }
    };

    verifyToken();
  }, []);

  if (isAuthenticated === null) {
    return <Spinner />; // Or a spinner component
  }

  return isAuthenticated ? children : <Navigate to="/" />;
};
