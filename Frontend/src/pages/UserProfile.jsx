import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft } from "react-icons/fa";
import { Skeleton, SkeletonCircle } from "../components/Skeleton";
import { PostCard } from "../components/PostCard";
import "./UserProfile.css";

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
const DEFAULT_IMAGE = `${BASE_URL}/default-photo.png`;

export const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const [userRes, postsRes] = await Promise.all([
          axios.get(`${BASE_URL}/user/${userId}`, { withCredentials: true }),
          axios.get(`${BASE_URL}/insta/user/${userId}`, { withCredentials: true })
        ]);
        setProfileUser(userRes.data);
        setPosts(postsRes.data);
      } catch (err) {
        console.error("Failed to load user profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [userId]);

  if (loading) {
    return (
      <div className="user-profile-container">
        <div className="user-profile-header skeleton-card">
          <SkeletonCircle size="120px" />
          <Skeleton width="200px" height="30px" style={{ marginTop: "20px" }} />
          <Skeleton width="300px" height="60px" style={{ marginTop: "15px" }} />
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="user-profile-container">
        <div className="error-state">
          <h2>User Not Found</h2>
          <button onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-container animate-in">
      <div className="user-profile-nav">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
      </div>

      <div className="user-profile-header glass-card">
        <img
          src={profileUser.image && !profileUser.image.includes('undefined') ? profileUser.image : DEFAULT_IMAGE}
          alt={profileUser.username}
          className="user-avatar-large"
          onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
        />
        <h2 className="user-name">{profileUser.username}</h2>
        {profileUser.description && (
          <p className="user-bio">{profileUser.description}</p>
        )}
        
        <div className="user-stats">
          <div className="stat-item">
            <span className="stat-value">{posts.length}</span>
            <span className="stat-label">Posts</span>
          </div>
          {/* Add more stats here if needed (e.g. friends count) */}
        </div>
      </div>

      <div className="user-posts-grid">
        {posts.length === 0 ? (
          <div className="empty-state">
            <p>No posts yet.</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post._id} className="user-post-card">
              <PostCard 
                post={post} 
                isMine={false} 
                currentUserId={localStorage.getItem("userId")}
                handlelike={() => {}} 
                toggleComments={() => {}} 
                handleDelete={() => {}}
                editingId={null}
                setEditingId={() => {}}
                editCaption={""}
                setEditCaption={() => {}}
                handleEdit={() => {}}
                showComments={{}}
                commentInputs={{}}
                setCommentInputs={() => {}}
                handleComment={(id, e) => e.preventDefault()}
                handleReport={() => {}}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
