import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar"; // adjust path if needed

export const Layout = () => {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="page-content">
        <Outlet />
      </div>
    </div>
  );
};
