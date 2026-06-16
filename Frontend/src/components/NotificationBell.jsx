import { useState, useEffect, useRef } from "react";
import { FaBell } from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./NotificationBell.css";

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");

export const NotificationBell = ({ socket }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/notifications`, { withCredentials: true });
        setNotifications(res.data);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notif) => {
      setNotifications(prev => [notif, ...prev]);
    };
    socket.on("notification", handleNewNotification);
    return () => socket.off("notification", handleNewNotification);
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${BASE_URL}/notifications/read-all`, {}, { withCredentials: true });
      setNotifications([]);
    } catch (err) {
      console.error("Failed to mark all as read");
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      await axios.post(`${BASE_URL}/notifications/read/${notif._id || notif.id}`, {}, { withCredentials: true });
      setNotifications(prev => prev.filter(n => n._id !== notif._id));
      
      if (notif.type === "message") navigate("/chat");
      else if (notif.type === "friend_request") navigate("/search");
      else navigate("/insta");
      
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to click notification");
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <div className="bell-icon-wrapper" onClick={() => setIsOpen(!isOpen)} title="Notifications">
        <FaBell />
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length > 99 ? '99+' : notifications.length}</span>
        )}
      </div>
      
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={handleMarkAllRead} className="mark-read-btn">Mark all read</button>
            )}
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No new notifications</div>
            ) : (
              notifications.map((notif, idx) => (
                <div key={notif._id || idx} className="notification-item" onClick={() => handleNotificationClick(notif)}>
                  <img 
                    src={notif.sender?.image && !notif.sender.image.includes('undefined') ? notif.sender.image : `${BASE_URL}/default-photo.png`}
                    alt={notif.sender?.username || "User"}
                    onError={(e) => { e.target.src = `${BASE_URL}/default-photo.png`; }}
                  />
                  <div className="notification-content">
                    <p>{notif.message || notif.data?.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
