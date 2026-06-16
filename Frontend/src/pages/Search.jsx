import { useState, useEffect } from "react";
import { sendrequest } from "../api/api";
import axios from "axios";
import "./Search.css";
import { FaUserPlus, FaSearch, FaUserFriends, FaCheck } from "react-icons/fa";
import { Skeleton } from "../components/Skeleton";

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
const DEFAULT_IMAGE = `${BASE_URL}/default-photo.png`;

export const Search = () => {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchUsers = async (pageNum = 1, append = false) => {
    if (input.trim() === "") {
      setResults([]);
      setHasMore(true);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/search`,
        { search: input, page: pageNum, limit: 12 },
        { withCredentials: true }
      );
      if (res.data.length < 12) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      if (append) {
        setResults(prev => [...prev, ...res.data]);
      } else {
        setResults(res.data);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    const delay = setTimeout(() => fetchUsers(1, false), 500);
    return () => clearTimeout(delay);
  }, [input]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUsers(nextPage, true);
  };

  const handleRequest = async (userId) => {
    setSentRequests(prev => ({ ...prev, [userId]: true }));
    try {
      await sendrequest(userId);
    } catch (err) {
      setSentRequests(prev => ({ ...prev, [userId]: false }));
      console.error("Failed to send request", err);
    }
  };

  const renderEmpty = () => {
    if (input.trim() === "") {
      return (
        <div className="empty-discover">
          <FaUserFriends className="empty-icon" />
          <p>Start typing to search the network.</p>
        </div>
      );
    }
    return (
      <div className="empty-discover">
        <p>No users found matching &quot;{input}&quot;</p>
      </div>
    );
  };

  return (
    <div className="discover-page">
      <div className="discover-header">
        <h1>Discover People</h1>
        <p>Find friends, colleagues, and interesting people.</p>
      </div>

      <div className="search-bar-container">
        <FaSearch className="search-icon" />
        <input
          type="text"
          className="discover-search-input"
          placeholder="Search by name or email..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
      </div>

      <div className="discover-content">
        {loading ? (
          <div className="discover-grid">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="discover-card skeleton-card">
                <Skeleton width="80px" height="80px" borderRadius="50%" style={{ marginBottom: "15px" }} />
                <Skeleton width="60%" height="20px" style={{ marginBottom: "10px" }} />
                <Skeleton width="80%" height="14px" style={{ marginBottom: "20px" }} />
                <Skeleton width="100%" height="35px" borderRadius="20px" />
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="discover-grid animate-in">
              {results.map((user) => (
                <div key={user._id} className="discover-card glass-card">
                  <img
                    className="discover-avatar"
                    src={user.image && !user.image.includes('undefined') ? user.image : DEFAULT_IMAGE}
                    alt={user.username}
                    onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
                  />
                  <h3>{user.username}</h3>
                  <p className="discover-desc">{user.description || "Hey there! I am using Connectify."}</p>
                  <button
                    className={`add-friend-btn ${sentRequests[user._id] ? 'sent' : ''}`}
                    onClick={() => handleRequest(user._id)}
                    disabled={sentRequests[user._id]}
                  >
                    {sentRequests[user._id] ? <><FaCheck /> Request Sent</> : <><FaUserPlus /> Add Friend</>}
                  </button>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="load-more-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button onClick={handleLoadMore} className="primary-btn">Load More</button>
              </div>
            )}
          </>
        ) : (
          renderEmpty()
        )}
      </div>
    </div>
  );
};
