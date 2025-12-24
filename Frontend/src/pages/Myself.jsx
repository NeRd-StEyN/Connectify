import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Cropper from "react-easy-crop";
import getCroppedImg from "./cropImageHelper";
import { FaCamera, FaTimes, FaCheck } from "react-icons/fa"; // camera icon
import "./Myself.css"; // custom styles
import { friends } from "../api/api";
import { pendingrequest } from "../api/api";
import { FaSave } from "react-icons/fa";
import { acceptFriendRequest, rejectFriendRequest } from "../api/api";
import { IoLogOut } from "react-icons/io5";

export const Myself = () => {
  const [user, setUser] = useState(null);


  const [desc, setDesc] = useState("");
  const [image, setImage] = useState("");
  const [message, setMessage] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(2);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const [pending, setpending] = useState([]);
  const [showfriends, setshowfriends] = useState([]);

  const [showPending, setShowPending] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  const togglePending = () => {
    setShowPending(prev => !prev);
    setShowFriends(false); // close others
  };

  const toggleFriends = () => {
    setShowFriends(prev => !prev);
    setShowPending(false); // close others
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/get-user`, {
          withCredentials: true,
        });
        setUser(res.data);
        setDesc(res.data.description || "");
        setImage(res.data.image || "");
      } catch (err) {
        console.error("Failed to load user", err);
      }
    };

    fetchUser();
  }, []);

  const handleSave = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/edituser`,
        { d: desc, n: user.username },
        { withCredentials: true }
      );
      setMessage("Profile updated!");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error("Update failed", err);
      setMessage("Update failed.");
    }
  };

  useEffect(() => {
    const fetchpending = async () => {
      try {
        const res = await pendingrequest();
        console.log("Pending request response:", res);
        setpending(res);
      } catch (err) {
        console.log("Error fetching pending requests:", err);
      }
    };

    fetchpending();
  }, []);

  useEffect(() => {
    const fetchfriends = async () => {
      try {
        const res = await friends();
        setshowfriends(res);
      } catch (err) {
        console.log(err);
      }
    };

    fetchfriends();
  }, []);


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowCropper(true);
      e.target.value = null;
    }
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropDone = async () => {
    try {
      const base64Image = await getCroppedImg(
        URL.createObjectURL(selectedFile),
        croppedAreaPixels
      );
      setImage(base64Image);
      setShowCropper(false);

      await axios.post(
        `${import.meta.env.VITE_API_URL}/upload-image`,
        { image: base64Image },
        { withCredentials: true }
      );

      setMessage("Image updated!");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error("Crop/upload failed", err);
      setMessage("Crop failed");
    }
  };


  const handleAccept = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      setpending(prev => prev.filter(r => r._id !== requestId));
    } catch (err) {
      console.error("Failed to accept request", err);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);
      setpending(prev => prev.filter(r => r._id !== requestId));
    } catch (err) {
      console.error("Failed to reject request", err);
    }
  };



  const handleUnfriend = async (requestId) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/friends/remove`,
        { requestId },
        { withCredentials: true }
      );

      // ✅ Correct the state update here
      setshowfriends(prev => prev.filter(f => f._id !== requestId));
    } catch (err) {
      console.error("Failed to unfriend", err);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/logout`, {}, { withCredentials: true });
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/logout-all`, {}, { withCredentials: true });

      localStorage.clear(); // also clear localStorage if needed
      window.location.href = "/";
    } catch (err) {
      console.error("Complete logout failed", err);
    }
  };



  if (!user) return <h2 style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>Loading...</h2>;

  return (
    <div className="m">
      <div className="myself-container animate-in">
        <div className="logout-dropdown">
          <button
            className="logout-btn"
            onClick={() => setDropdownOpen((prev) => !prev)}
            title="Logout"
          >
            <IoLogOut />
          </button>
          {dropdownOpen && (
            <div className="dropdown-menu">
              <p onClick={handleLogout}>Logout (This Tab)</p>
              <p onClick={handleLogoutAll}>Logout all devices</p>
            </div>
          )}
        </div>

        <div className="profile-header">
          <div className="profile-pic-wrapper">
            <img src={image} alt="Profile" className="profile-pic" />
            <label htmlFor="fileInput" className="file-upload-icon">
              <FaCamera />
            </label>
            <input
              id="fileInput"
              type="file"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>
          <div className="profile-info">
            <h3>{user.username}</h3>
            <p>{pending.length} pending requests • {showfriends.length} friends</p>
          </div>
        </div>

        <div className="desc-section">
          <label>About Me</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            placeholder="Tell the world something about you..."
            spellCheck={false}
          />
        </div>

        <FaSave onClick={handleSave} className="save-btn" title="Save Changes" />

        {message && <p className="messag">{message}</p>}

        {showCropper && (
          <div className="cropper-modal">
            <div className="cropper-container">
              <Cropper
                image={URL.createObjectURL(selectedFile)}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(e.target.value)}
              className="zoom-slider"
            />
            <button onClick={handleCropDone} className="crop-btn">
              Crop & Upload
            </button>
          </div>
        )}




        <div className="friends-section">
          <div className="section-title" onClick={togglePending}>
            <span>Pending Requests ({pending.length})</span>
            <span>{showPending ? "↑" : "↓"}</span>
          </div>
          {showPending && (
            <ul>
              {pending.map((cur) => (
                <li key={cur._id} className="pending-li">
                  <p>{cur.sender.username}</p>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <FaCheck
                      onClick={() => handleAccept(cur._id)}
                      style={{ cursor: "pointer", color: "var(--success)" }}
                    />
                    <FaTimes
                      onClick={() => handleReject(cur._id)}
                      style={{ cursor: "pointer", color: "var(--error)" }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="section-title" onClick={toggleFriends}>
            <span>Friends ({showfriends.length})</span>
            <span>{showFriends ? "↑" : "↓"}</span>
          </div>
          {showFriends && (
            <ul>
              {showfriends.map((cur) => {
                const friend = cur.sender._id === user._id ? cur.recipient : cur.sender;
                return (
                  <li key={cur._id} className="friend-item">
                    <p>{friend.username}</p>
                    <FaTimes
                      onClick={() => handleUnfriend(cur._id)}
                      style={{ cursor: "pointer", color: "var(--error)" }}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>




      </div>

    </div>
  );
};
