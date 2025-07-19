import { useState } from "react";
import { ExtraSidebar } from "./extrasidebar"; // your sidebar
import { ChatBox } from "./ChatBox";
import { IoIosChatbubbles } from "react-icons/io";
export const Chat = () => {
  const [input, setinput] = useState("");
  const [user, setuser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div style={{ display: "flex" }}>
      <ExtraSidebar
        input={input}
        val="chat"
        setSidebarOpen={setSidebarOpen}
        sidebarOpen={sidebarOpen}
        setinput={setinput}
        user={user}
        setuser={setuser}
      />

      {user ? (
        <ChatBox friend={user}  sidebarOpen={sidebarOpen}/>
      ) : (
        <div
          style={{
            flexGrow: 1,
            display: "flex",
               margin:"0 auto 0 100px",

            justifyContent: "center",
            alignItems: "center",
            height: "100vh", // make sure it's full height
          }}
        >
          <p
            style={{
              margin:"0 auto 0 auto",
              fontWeight: "bolder",
              fontSize: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <IoIosChatbubbles style={{ fontSize: "2.5rem" }} />
            Select a friend to start chatting
          </p>
        </div>
      )}
    </div>

  );
};
