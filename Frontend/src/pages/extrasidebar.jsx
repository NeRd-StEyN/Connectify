import { useEffect, useState } from "react";
import "./extrasidebar.css";
import axios from "axios";
import { Spinner } from "../Spinner.jsx";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoClose } from "react-icons/io5";

export const ExtraSidebar = ({ input, setinput, setSidebarOpen, user, sidebarOpen, setuser, val }) => {
  const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
  const DEFAULT_IMAGE = `${BASE_URL}/default-photo.png`;
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (input.trim() === "") {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const endpoint = val === "search" ? "/search" : "/getchatlist";
        const res = await axios.post(
          `${BASE_URL}${endpoint}`,
          { search: input },
          { withCredentials: true }
        );
        setResults(res.data);
        setShowDropdown(true);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(fetchUsers, 500);
    return () => clearTimeout(delay);
  }, [input, val]);

  return (
    <div className="extra-sidebar-container">
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
        {loading && <Spinner />}

        {showDropdown && results.length > 0 && (
          <ul className="search-results animate-in">
            {results.map((item) => (
              <li key={item._id} onClick={() => {
                setuser(item);
                setShowDropdown(false);
                setinput("");
                setSidebarOpen(false);
              }}>
                <img
                  src={item.image && !item.image.includes('undefined') ? item.image : DEFAULT_IMAGE}
                  alt={item.username}
                  onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
                />
                <span>{item.username}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
