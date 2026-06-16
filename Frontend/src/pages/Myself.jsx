import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Cropper from "react-easy-crop";
import getCroppedImg from "./cropImageHelper";
import { FaCamera, FaTimes, FaCheck, FaSave, FaUserFriends, FaUserPlus, FaSignOutAlt } from "react-icons/fa";
import { friends, pendingrequest, acceptFriendRequest, rejectFriendRequest } from "../api/api";
import { Skeleton, SkeletonCircle } from "../components/Skeleton";
import "./Myself.css";

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
const DEFAULT_IMAGE = `${BASE_URL}/default-photo.png`;

export const Myself = () => {
  const queryClient = useQueryClient();
  const cachedData = queryClient.getQueryData(["myselfData"]);

  const [user, setUser] = useState(cachedData?.user || null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [desc, setDesc] = useState(cachedData?.user?.description || "");
  const [image, setImage] = useState(cachedData?.user?.image || "");
  const [message, setMessage] = useState({ text: "", type: "" });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(2);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const [pending, setPending] = useState(cachedData?.pending || []);
  const [showfriends, setShowFriends] = useState(cachedData?.friends || []);
  const [activeTab, setActiveTab] = useState("friends");

  const { data: myselfData, isLoading: loadingUser } = useQuery({
    queryKey: ["myselfData"],
    queryFn: async () => {
      const [userRes, pendingRes, friendsRes] = await Promise.all([
        axios.get(`${BASE_URL}/get-user`, { withCredentials: true }),
        pendingrequest(),
        friends()
      ]);
      return {
        user: userRes.data,
        pending: pendingRes || [],
        friends: friendsRes || []
      };
    }
  });

  useEffect(() => {
    if (myselfData && !cachedData) {
      setUser(myselfData.user);
      setDesc(myselfData.user.description || "");
      setImage(myselfData.user.image || DEFAULT_IMAGE);
      setPending(myselfData.pending);
      setShowFriends(myselfData.friends);
    }
  }, [myselfData, cachedData]);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [selectedFile]);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const handleSave = async () => {
    try {
      setLoadingAction(true);
      await axios.post(`${BASE_URL}/edituser`, { d: desc, n: user.username }, { withCredentials: true });
      showMessage("Profile updated successfully");
    } catch (err) {
      console.error("Update failed", err);
      showMessage("Failed to update profile", "error");
    } finally {
      setLoadingAction(false);
    }
  };

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
      setLoadingAction(true);
      const base64Image = await getCroppedImg(previewUrl, croppedAreaPixels);
      setImage(base64Image);
      setShowCropper(false);

      await axios.post(`${BASE_URL}/upload-image`, { image: base64Image }, { withCredentials: true });
      showMessage("Profile picture updated");
    } catch (err) {
      console.error("Upload failed", err);
      showMessage("Failed to update picture", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAccept = async (requestId) => {
    // Optimistic Update
    const acceptedReq = pending.find(r => r._id === requestId);
    setPending(prev => prev.filter(r => r._id !== requestId));
    if(acceptedReq) setShowFriends(prev => [...prev, acceptedReq]);
    
    try {
      await acceptFriendRequest(requestId);
      showMessage("Friend request accepted");
    } catch (err) {
      // Revert on failure
      if(acceptedReq) {
        setPending(prev => [...prev, acceptedReq]);
        setShowFriends(prev => prev.filter(f => f._id !== acceptedReq._id));
      }
      console.error("Failed to accept", err);
      showMessage("Failed to accept", "error");
    }
  };

  const handleReject = async (requestId) => {
    const rejectedReq = pending.find(r => r._id === requestId);
    setPending(prev => prev.filter(r => r._id !== requestId));
    
    try {
      await rejectFriendRequest(requestId);
    } catch (err) {
      if(rejectedReq) setPending(prev => [...prev, rejectedReq]);
      console.error("Failed to reject", err);
    }
  };

  const handleUnfriend = async (requestId) => {
    const removedFriend = showfriends.find(f => f._id === requestId);
    setShowFriends(prev => prev.filter(f => f._id !== requestId));
    
    try {
      await axios.post(`${BASE_URL}/friends/remove`, { requestId }, { withCredentials: true });
      showMessage("Friend removed");
    } catch (err) {
      if(removedFriend) setShowFriends(prev => [...prev, removedFriend]);
      console.error("Failed to unfriend", err);
      showMessage("Failed to remove friend", "error");
    }
  };

  const handleLogoutAll = async () => {
    setLoadingAction(true);
    try {
      await axios.post(`${BASE_URL}/logout-all`, {}, { withCredentials: true });
      localStorage.clear();
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed", err);
      setLoadingAction(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header skeleton-card">
          <SkeletonCircle size="120px" />
          <Skeleton width="200px" height="30px" style={{ marginTop: "20px" }} />
          <Skeleton width="300px" height="60px" style={{ marginTop: "15px" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container animate-in">
      {message.text && (
        <div className={`dashboard-toast ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="dashboard-header glass-card">
        <div className="profile-avatar-container">
          <img
            src={image && !image.includes('undefined') ? image : DEFAULT_IMAGE}
            alt="Profile"
            className="profile-avatar-large"
            onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
          />
          <label htmlFor="fileInput" className="avatar-edit-overlay">
            <FaCamera />
          </label>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
        <h1 className="profile-name">{user?.username}</h1>
        
        <div className="profile-bio-editor">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={3}
          />
          <button className="btn-primary" onClick={handleSave} disabled={loadingAction}>
            {loadingAction ? "Saving..." : <><FaSave /> Save Bio</>}
          </button>
        </div>

        <button className="btn-danger logout-btn-dash" onClick={handleLogoutAll}>
          <FaSignOutAlt /> Log out
        </button>
      </div>

      {showCropper && (
        <div className="cropper-modal-overlay">
          <div className="cropper-modal-content glass-card">
            <h3>Adjust Photo</h3>
            <div className="cropper-wrapper">
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="cropper-actions">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(e.target.value)}
              />
              <div className="cropper-buttons">
                <button className="btn-secondary" onClick={() => setShowCropper(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleCropDone} disabled={loadingAction}>
                  {loadingAction ? "Saving..." : "Save Photo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-network glass-card">
        <div className="network-tabs">
          <button 
            className={`network-tab ${activeTab === "friends" ? "active" : ""}`}
            onClick={() => setActiveTab("friends")}
          >
            <FaUserFriends /> Friends ({showfriends.length})
          </button>
          <button 
            className={`network-tab ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            <FaUserPlus /> Pending ({pending.length})
            {pending.length > 0 && <span className="badge-dot" />}
          </button>
        </div>

        <div className="network-content">
          {activeTab === "friends" && (
            <div className="network-grid">
              {showfriends.length === 0 ? (
                <p className="empty-network">You have no friends yet.</p>
              ) : (
                showfriends.map((cur) => {
                  const friend = cur.sender?._id === user._id ? cur.recipient : cur.sender;
                  return (
                    <div key={cur._id} className="network-card">
                      <img 
                        src={friend.image && !friend.image.includes('undefined') ? friend.image : DEFAULT_IMAGE} 
                        alt={friend.username} 
                        onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
                      />
                      <span className="network-name">{friend.username}</span>
                      <button className="btn-danger-icon" onClick={() => handleUnfriend(cur._id)} title="Unfriend">
                        <FaTimes />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "pending" && (
            <div className="network-grid">
              {pending.length === 0 ? (
                <p className="empty-network">No pending requests.</p>
              ) : (
                pending.map((cur) => (
                  <div key={cur._id} className="network-card">
                    <img 
                      src={cur.sender.image && !cur.sender.image.includes('undefined') ? cur.sender.image : DEFAULT_IMAGE} 
                      alt={cur.sender.username} 
                      onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
                    />
                    <span className="network-name">{cur.sender.username}</span>
                    <div className="network-actions">
                      <button className="btn-success-icon" onClick={() => handleAccept(cur._id)}><FaCheck /></button>
                      <button className="btn-danger-icon" onClick={() => handleReject(cur._id)}><FaTimes /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
