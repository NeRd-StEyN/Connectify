import "./sidebar.css";
import { FaRocketchat, FaInstagram, FaSearch, FaUser, FaCog } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import { useTheme } from "../context/ThemeContext";
import { FiSun, FiMoon } from "react-icons/fi";

export const Sidebar = () => {
  const userId = localStorage.getItem("userId");
  const { socket } = useSocket(userId);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="main">
      <div className="sidebar">
        <div className="sidebar-logo">
          <FaRocketchat className="sidebar-logo-icon" />
          <span>Connectify</span>
        </div>

        <div className="nav-links">
          <NavLink to="/search" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <FaSearch className="nav-icon" />
            <span className="nav-text">Discover</span>
          </NavLink>

          <NavLink to="/chat" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <FaRocketchat className="nav-icon" />
            <span className="nav-text">Messages</span>
          </NavLink>

          <NavLink to="/insta" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <FaInstagram className="nav-icon" />
            <span className="nav-text">Feed</span>
          </NavLink>

          <NavLink to="/myself" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <FaUser className="nav-icon" />
            <span className="nav-text">Profile</span>
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <FaCog className="nav-icon" />
            <span className="nav-text">Settings</span>
          </NavLink>
        </div>

        <div className="sidebar-bottom">
          <button className="theme-toggle-sidebar" onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <FiSun /> : <FiMoon />}
            <span className="nav-text">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
