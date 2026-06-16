import { useState } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatBox } from "./ChatBox";
import { IoIosChatbubbles } from "react-icons/io";
import { useSocket } from "../hooks/useSocket";
import "./Chat.css";

export const Chat = () => {
  const [user, setuser] = useState(null);
  const userId = localStorage.getItem("userId");
  const { socket, onlineUsers, typingUsers } = useSocket(userId);

  return (
    <div className="chat-page-container">
      <div className={`chat-sidebar-wrapper ${user ? "hide-on-mobile" : ""}`}>
        <ChatSidebar
          user={user}
          setuser={setuser}
          onlineUsers={onlineUsers}
        />
      </div>

      <div className={`chat-main-wrapper ${!user ? "hide-on-mobile" : ""}`}>
        {user ? (
          <ChatBox 
            friend={user} 
            socket={socket} 
            typingUsers={typingUsers} 
            onBack={() => setuser(null)}
          />
        ) : (
        <div
          style={{
            flexGrow: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <p
            style={{
              fontWeight: "bolder",
              fontSize: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              color: "#aaa"
            }}
          >
            <IoIosChatbubbles style={{ fontSize: "2.5rem" }} />
            Select a friend to start chatting
          </p>
        </div>
      )}
      </div>
    </div>
  );
};
