import { useEffect, useState } from "react";
import "./extrasidebar.css";
import axios from "axios";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoClose } from "react-icons/io5";

export const ExtraSidebar = ({ input, setinput, setSidebarOpen, user, sidebarOpen, setuser, val }) => {
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (input.trim() === "") {
        setResults([]);
        return;
      }

      try {
        const endpoint = val === "search" ? "/search" : "/getchatlist";
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}${endpoint}`,
          { search: input },
          { withCredentials: true }
        );
        setResults(res.data);
        setShowDropdown(true);
      } catch (err) {
        console.error("Search failed", err);
      }
    };

    const delay = setTimeout(fetchUsers, 500);
    return () => clearTimeout(delay);
  }, [input, val]);

  return (
    <div className="extra-sidebar-container">
      {/* Search Toggle Icon (Hamburger / Search icon) */}
      <div
        className="hamburger-trigger"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? "Close Search" : "Open Search"}
      >
        {sidebarOpen ? <IoClose /> : <GiHamburgerMenu />}
      </div>

      <div className={`extra-sidebar ${sidebarOpen ? "open" : "close"}`}>
        <input
          type="text"
          className="input"
          value={input}
          onChange={(e) => setinput(e.target.value)}
          placeholder={val === "search" ? "Search users by name..." : "Find a conversation..."}
          autoFocus={sidebarOpen}
        />

        {showDropdown && results.length > 0 && (
          <ul className="search-results animate-in">
            {results.map((item) => (
              <li key={item._id} onClick={() => {
                setuser(item);
                setShowDropdown(false);
                setinput("");
                setSidebarOpen(false); // Close bar after selection
              }}>
                <img src={item.image || `${import.meta.env.VITE_API_URL}/default-user.png`} alt={item.username} />
                <span>{item.username}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
