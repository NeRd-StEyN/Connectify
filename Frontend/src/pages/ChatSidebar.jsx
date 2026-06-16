import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./ChatSidebar.css";
import { decryptText } from "./encryption";

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
const DEFAULT_IMAGE = `${BASE_URL}/default-photo.png`;

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export const ChatSidebar = ({ user, setuser, onlineUsers }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${BASE_URL}/getchatlist`,
        { search },
        { withCredentials: true }
      );
      
      const decryptedFriends = res.data.map(f => {
        if (f.lastMessage && f.lastMessage.preview && f.lastMessage.preview !== '📷 Photo') {
          f.lastMessage.preview = decryptText(f.lastMessage.preview);
        }
        return f;
      });
      setFriends(decryptedFriends);
    } catch (err) {
      console.error("Fetch friends failed", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const delay = setTimeout(fetchFriends, 300);
    return () => clearTimeout(delay);
  }, [fetchFriends]);

  // When a message is sent/received refresh list for last message update
  const refreshList = () => fetchFriends();

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h2>Messages</h2>
        <div className="chat-search-bar">
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="chat-search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="sidebar-skeleton-list">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="sidebar-skeleton-item">
              <div className="skeleton-avatar-sm" />
              <div className="skeleton-lines">
                <div className="skeleton-line short" />
                <div className="skeleton-line long" />
              </div>
            </div>
          ))}
        </div>
      ) : friends.length === 0 ? (
        <p className="no-friends">
          {search ? "No conversations found." : "No conversations yet. Go to Discover to find friends."}
        </p>
      ) : (
        <ul className="chat-list">
          {friends.map((friend) => {
            const isOnline = onlineUsers.includes(friend._id);
            const isActive = user && user._id === friend._id;
            const unread = friend.unreadCount || 0;
            const lastMsg = friend.lastMessage;

            return (
              <li
                key={friend._id}
                className={`chat-list-item ${isActive ? "active" : ""} ${unread > 0 ? "has-unread" : ""}`}
                onClick={() => {
                  setuser(friend);
                  // Clear local unread count optimistically
                  setFriends(prev => prev.map(f =>
                    f._id === friend._id ? { ...f, unreadCount: 0 } : f
                  ));
                }}
              >
                <div className="chat-avatar-container">
                  <img
                    src={friend.image && !friend.image.includes("undefined") ? friend.image : DEFAULT_IMAGE}
                    alt={friend.username}
                    onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
                    className="chat-avatar"
                  />
                  {isOnline && <span className="online-dot" />}
                </div>

                <div className="chat-info">
                  <div className="chat-info-top">
                    <span className={`chat-name ${unread > 0 ? "bold" : ""}`}>{friend.username}</span>
                    {lastMsg && (
                      <span className="chat-time">{formatTime(lastMsg.timestamp)}</span>
                    )}
                  </div>
                  <div className="chat-info-bottom">
                    <span className={`chat-preview ${unread > 0 ? "bold" : ""}`}>
                      {lastMsg
                        ? (lastMsg.isMine ? `You: ${lastMsg.preview}` : lastMsg.preview) || "📷 Photo"
                        : isOnline ? "Online" : "Tap to chat"}
                    </span>
                    {unread > 0 && (
                      <span className="unread-badge">{unread > 99 ? "99+" : unread}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
