import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Cropper from "react-easy-crop";
import getCroppedImg from "./cropImageHelper";
import { FaCamera,FaTimes,FaCheck } from "react-icons/fa"; // camera icon
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



  if (!user) return <h2 style={{display:"flex",justifyContent:"center",alignItems:"center"}}>Loading...</h2>;

  return (
    <div className="m"  >

      <div className="myself-container" style={{ caretColor: "transparent" }}>
        <h1 className="myself">Myself</h1>
        <div className="logout-dropdown">
          <button
            className="logout-btn"
            onClick={() => setDropdownOpen((prev) => !prev)}
          >
            <IoLogOut />
          </button>

          {dropdownOpen && (
            <div className="dropdown-menu">
              <p onClick={handleLogout}>Logout (This Tab)</p>
              <p onClick={handleLogoutAll}>Logout from All Devices</p>
            </div>
          )}
        </div>


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

        <h3 style={{ maxWidth: "400px", // or any suitable width
  wordBreak: "break-word", // forces long names to break
  fontWeight: "bolder",
  whiteSpace: "normal", fontSize:"2rem", marginLeft: "60px",}}>Username: {user.username}</h3>
          <label style={{ fontSize:"1.5rem", marginLeft: "60px"}}><strong>DESCRIPTION:</strong></label>
        <div className="desc"
          
        >
        
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="Write something about yourself..."
            style={{
              width: "100%",
              fontSize: "20px",
              border: "none",
              background: "transparent",
              resize: "none",
              color: "black",
              outline: "none",
              overflow: "auto",
              cursor: "text",
              caretColor: "lime"
            }}
          />
        </div>

          <FaSave onClick={handleSave} title="Save Changes" className="save-btn" />
       
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


 
    
      <div className="pending">
  <h3  onClick={togglePending} style={{ fontSize:"1.7rem",cursor: "pointer" }}>
    Pending Requests: {pending.length} {showPending ? "🔼" : "🔽"}
  </h3>
  {showPending && (
   <ul>
  {pending.map((cur) => (
    <li key={cur._id} className="pending-li">
      <div className="pending-item">
        <p
          style={{
            display: "inline-block",
            maxWidth: "100px",
            wordBreak: "break-word",
            fontWeight: "bolder",
            whiteSpace: "normal",
                marginLeft:"-9rem"
          }}
        >
          {cur.sender.username}
        </p>
        <FaCheck
          className="common"
          onClick={() => handleAccept(cur._id)}
          style={{
            cursor: "pointer",
            color: "green",
            fontSize: "2rem",
          }}
        />
        <FaTimes
          className="common"
          onClick={() => handleReject(cur._id)}
          style={{
            cursor: "pointer",
            color: "red",
            fontSize: "2rem",
          }}
        />
      </div>
    </li>
  ))}
</ul>

  )}
</div>

<div className="accepted">
  <h3 onClick={toggleFriends} style={{ fontSize: "1.7rem", cursor: "pointer" }}>
    Friends: {showfriends.length} {showFriends ? "🔼" : "🔽"}
  </h3>
  {showFriends && (
    <ul>
      {showfriends.map((cur) => {
        if (!cur.sender || !cur.recipient) return null;
        const friend = cur.sender._id === user._id ? cur.recipient : cur.sender;
        return (
          <li key={cur._id}>
            <div className="friend-item">
              <p style={{
                display: "inline-block",
                maxWidth: "100px",
                wordBreak: "break-word",
                fontWeight: "bolder",
                whiteSpace: "normal",
                marginLeft:"-3rem"
              }}>
                {friend.username}
              </p>
              <FaTimes
                className="common"
                onClick={() => handleUnfriend(cur._id)}
                style={{
                  cursor: "pointer",
                  color: "red",
                  fontSize: "2rem",
                }}
              />
            </div>
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
