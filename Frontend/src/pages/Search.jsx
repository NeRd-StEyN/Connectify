import { useState, useEffect } from "react";
import { sendrequest } from "../api/api";
import "./Search.css";
import { FaUserPlus } from "react-icons/fa";
import { FaUserFriends } from "react-icons/fa";
import { ExtraSidebar } from "./extrasidebar";
export const Search = () => {
  const [input, setinput] = useState("");
  const [user, setuser] = useState(null);
  const [message, setmessage] = useState("");
  const [error, seterror] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handlerequest = async () => {
    try {
      await sendrequest(user._id);

      setmessage("Friend request sent");
      seterror(false);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setmessage(err.response.data.message);
      } else {
        setmessage("Something went wrong.");
      }
      seterror(true);
    }
  };

  useEffect(() => {
    if (!message) return;
    const it = setInterval(() => {
      setmessage("");

    }, 1500);

    return () => clearInterval(it);
  }, [message]);
  return (
    <>


      <ExtraSidebar input={input} setinput={setinput} user={user} setuser={setuser} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} val="search" />
      <div className="searched">
        {user ? (
          <div className="search-card">
            {user.image && <img className="img" src={user.image} alt={user.username} />}
            <h1>{user.username}</h1>
            {user.description && <h2>{user.description}</h2>}
            <div className="button" onClick={handlerequest} title="Send Friend Request">
              <FaUserPlus />
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>
              <FaUserFriends style={{ fontSize: "3rem", opacity: 0.2, marginBottom: "16px" }} />
              <span>Select a user to connect</span>
            </p>
          </div>
        )}
        {message && <div className={error ? "error" : "success"}>{message}</div>}
      </div>
    </>
  );
};
