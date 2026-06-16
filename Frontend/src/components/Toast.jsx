import { useState, useEffect } from "react";
import "./Toast.css";
import { useNavigate } from "react-router-dom";

export const Toast = ({ socket }) => {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notif) => {
      const id = Date.now();
      setToasts(prev => [...prev, { ...notif, id }]);
      
      // Auto remove after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    };
    
    socket.on("notification", handleNewNotification);
    return () => socket.off("notification", handleNewNotification);
  }, [socket]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleToastClick = (notif) => {
    if (notif.type === "message") navigate("/chat");
    else if (notif.type === "friend_request") navigate("/search");
    else navigate("/insta");
    removeToast(notif.id);
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast-notification animate-in" onClick={() => handleToastClick(toast)}>
          <div className="toast-content">
            <strong>{toast.sender?.username || "User"}</strong>
            <p>{toast.message || toast.data?.message}</p>
          </div>
          <button className="toast-close" onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}>&times;</button>
        </div>
      ))}
    </div>
  );
};
