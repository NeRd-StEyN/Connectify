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
      {!user && <div
        style={{
          flexGrow: 1,
          display: "flex",
          margin: "0 auto 0 100px",

          justifyContent: "center",
          alignItems: "center",
          height: "100vh", // make sure it's full height
        }}
      >
        <p
          style={{
            margin: "0 auto 0 auto",
            fontWeight: "bolder",
            fontSize: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <FaUserFriends style={{ fontSize: "2.5rem" }} />
          Select a user to send friend request
        </p>
      </div>}
      <div className="searched">

        {user?.image && <img className="img" src={user?.image}></img>}
        {user?.username && <h1 style={{ maxWidth: "400px", wordBreak: "break-word" }}
>{`Username :${user?.username ? user?.username : ""}`}</h1>}
        {user?.description && <h2 style={{ maxWidth: "400px", wordBreak: "break-word" }}
>{`Description :${user.description}`}</h2>}
        {user?.username && ( <FaUserPlus  title="Send Friend Request"className="button" onClick={handlerequest}/>)}
        {message && <h3 className={`${error == true ? "error" : "success"}`}>{message}</h3>}
      </div>
    </>
  );
};
