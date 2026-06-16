import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar"; 
import { Toast } from "../components/Toast";
import { useSocket } from "../hooks/useSocket";

export const Layout = () => {
  const userId = localStorage.getItem("userId");
  const { socket } = useSocket(userId);

  return (
    <div className="layout-container">
      <Sidebar />
      <div className="page-content">
        <Outlet />
      </div>
      <Toast socket={socket} />
    </div>
  );
};
