import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

// Singleton socket instance to avoid multiple connections across components
let globalSocket = null;

export const useSocket = (userId) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set()); // Store typing user IDs

  useEffect(() => {
    if (!userId) return;

    if (!globalSocket) {
      globalSocket = io(import.meta.env.VITE_API_URL || "http://localhost:9000", {
        withCredentials: true,
        transports: ["websocket", "polling"]
      });
    }
    
    setSocket(globalSocket);

    // Register user upon connecting (and reconnecting)
    const onConnect = () => {
      globalSocket.emit("register", userId);
    };
    globalSocket.on("connect", onConnect);

    // Also register immediately in case it's already connected
    if (globalSocket.connected) {
      onConnect();
    }

    const handleOnlineUsers = (users) => setOnlineUsers(users);
    const handleTyping = (fromId) => setTypingUsers((prev) => new Set(prev).add(fromId));
    const handleStopTyping = (fromId) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fromId);
        return newSet;
      });
    };

    globalSocket.on("online-users", handleOnlineUsers);
    globalSocket.on("user-typing", handleTyping);
    globalSocket.on("user-stop-typing", handleStopTyping);

    // Cleanup listeners on unmount
    return () => {
      globalSocket.off("connect", onConnect);
      globalSocket.off("online-users", handleOnlineUsers);
      globalSocket.off("user-typing", handleTyping);
      globalSocket.off("user-stop-typing", handleStopTyping);
    };
  }, [userId]);

  return { socket, onlineUsers, typingUsers };
};
