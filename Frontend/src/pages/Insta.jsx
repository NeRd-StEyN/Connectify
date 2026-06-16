import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./insta.css";
import { FaHeart, FaRegHeart, FaRegComment, FaEdit, FaTrash, FaCheck, FaImage, FaVideo, FaFlag } from "react-icons/fa";

import {
  addpost,
  getmypost,
  deletepost,
  editpost,
  likeorunlikepost,
  commentonpost
} from "../api/api";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "../components/Skeleton";
import axios from "axios";
import { compressImage } from "../utils/imageCompression";
import { StoriesTray } from "../components/StoriesTray";
import { PostCard } from "../components/PostCard";

const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";
const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
const DEFAULT_IMAGE = `${BASE_URL}/default-photo.png`;

export const Insta = () => {
  const [activeTab, setActiveTab] = useState("feed");
  const [image, setimage] = useState(null);
  const [caption, setcaption] = useState("");
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [myposts, setMyposts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editCaption, setEditCaption] = useState("");
  const [commentInputs, setCommentInputs] = useState({});
  const [showComments, setShowComments] = useState({});
  const [loadingMyPost, setLoadingMyPost] = useState(false);

  const [reportedPosts, setReportedPosts] = useState({});

  const handleReport = async (id) => {
    if (reportedPosts[id]) return;
    setReportedPosts(prev => ({ ...prev, [id]: true }));
    try {
      await axios.post(`${BASE_URL}/insta/post/${id}/report`, {}, { withCredentials: true });
    } catch (err) {
      console.error("Report failed", err);
      setReportedPosts(prev => ({ ...prev, [id]: false }));
    }
  };

  const { ref, inView } = useInView();

  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem("userId");

  const fetchPostsPage = async ({ pageParam = 1 }) => {
    const res = await fetch(`${BASE_URL}/insta/posts?page=${pageParam}`, { credentials: "include" });
    if (!res.ok) throw new Error("Network response was not ok");
    return await res.json();
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingAll
  } = useInfiniteQuery({
    queryKey: ["all-posts"],
    queryFn: fetchPostsPage,
    getNextPageParam: (lastPage, allPages) => lastPage.length === 10 ? allPages.length + 1 : undefined,
  });

  useEffect(() => {
    if (inView && hasNextPage) fetchNextPage();
  }, [inView, hasNextPage, fetchNextPage]);

  useEffect(() => {
    if (activeTab === "my") fetchMyPosts();
  }, [activeTab]);

  const fetchMyPosts = async () => {
    try {
      setLoadingMyPost(true);
      const res = await getmypost();
      setMyposts(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMyPost(false);
    }
  };

  const handleaddpost = async () => {
    if (!image || !caption.trim()) return;
    setLoadingUpload(true);
    try {
      const formData = new FormData();
      formData.append("file", image);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const isVideo = typeof image !== "string" && image.type && image.type.startsWith("video/");
      const uploadUrl = isVideo
        ? "https://api.cloudinary.com/v1_1/dwzvlijky/video/upload"
        : "https://api.cloudinary.com/v1_1/dwzvlijky/image/upload";

      const res = await fetch(uploadUrl, { method: "POST", body: formData });
      const uploadData = await res.json();
      if (uploadData.error) throw new Error(uploadData.error.message);

      await addpost({ caption, image: uploadData.secure_url });
      setcaption("");
      setimage(null);
      setActiveTab("my");
      queryClient.invalidateQueries(["all-posts"]);
    } catch (err) {
      console.error("Error adding post:", err);
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletepost(id);
      setMyposts((prev) => prev.filter((post) => post._id !== id));
      queryClient.invalidateQueries(["all-posts"]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = async (id) => {
    if (!editCaption.trim()) return;
    try {
      const post = myposts.find((p) => p._id === id);
      await editpost({ id, caption: editCaption, image: post.image });
      setEditingId(null);
      setEditCaption("");
      fetchMyPosts();
      queryClient.invalidateQueries(["all-posts"]);
    } catch (err) {
      console.error(err);
    }
  };

  const handlelike = async (id) => {
    // Optimistic Update for React Query (Feed)
    await queryClient.cancelQueries(["all-posts"]);
    const previousPosts = queryClient.getQueryData(["all-posts"]);
    queryClient.setQueryData(["all-posts"], (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map(page => 
          page.map(post => {
            if (post._id === id) {
              const isLiked = post.likes.includes(currentUserId);
              return {
                ...post,
                likes: isLiked ? post.likes.filter(uid => uid !== currentUserId) : [...post.likes, currentUserId]
              };
            }
            return post;
          })
        )
      };
    });

    // Optimistic Update for My Posts state
    setMyposts(prev => prev.map(post => {
      if (post._id === id) {
        const isLiked = post.likes.includes(currentUserId);
        return {
          ...post,
          likes: isLiked ? post.likes.filter(uid => uid !== currentUserId) : [...post.likes, currentUserId]
        };
      }
      return post;
    }));

    try {
      await likeorunlikepost(id);
    } catch (err) {
      queryClient.setQueryData(["all-posts"], previousPosts);
      fetchMyPosts();
      console.error(err);
    }
  };

  const handleComment = async (id, e) => {
    e.preventDefault();
    const text = commentInputs[id]?.trim();
    if (!text) return;
    
    // Optimistic Update for Comments
    const newComment = { text, user: { _id: currentUserId, username: "Me" } }; // We can't know our own image synchronously unless stored in localstorage, but "Me" is fine.

    await queryClient.cancelQueries(["all-posts"]);
    const previousPosts = queryClient.getQueryData(["all-posts"]);

    queryClient.setQueryData(["all-posts"], (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map(page => page.map(post => {
          if (post._id === id) return { ...post, comments: [...post.comments, newComment] };
          return post;
        }))
      };
    });

    setMyposts(prev => prev.map(post => {
      if (post._id === id) return { ...post, comments: [...post.comments, newComment] };
      return post;
    }));

    setCommentInputs(prev => ({ ...prev, [id]: "" }));
    setShowComments(prev => ({ ...prev, [id]: true }));

    try {
      await commentonpost({ id, text });
    } catch (err) {
      queryClient.setQueryData(["all-posts"], previousPosts);
      console.error(err);
    }
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const postCardProps = {
    currentUserId,
    handlelike,
    toggleComments,
    handleDelete,
    editingId,
    setEditingId,
    editCaption,
    setEditCaption,
    handleEdit,
    showComments,
    commentInputs,
    setCommentInputs,
    handleComment,
    handleReport
  };

  const renderSkeletons = () => (
    Array(3).fill(0).map((_, i) => (
      <div key={i} className="feed-card skeleton-card">
        <div className="feed-header">
          <Skeleton width="40px" height="40px" borderRadius="50%" />
          <Skeleton width="120px" height="16px" />
        </div>
        <Skeleton width="100%" height="400px" borderRadius="0" />
        <div className="feed-footer">
          <Skeleton width="80px" height="20px" style={{ marginBottom: "10px" }}/>
          <Skeleton width="60%" height="14px" />
        </div>
      </div>
    ))
  );

  return (
    <div className="discover-container">
      <div className="feed-tabs">
        <button className={activeTab === "feed" ? "active" : ""} onClick={() => setActiveTab("feed")}>Global Feed</button>
        <button className={activeTab === "my" ? "active" : ""} onClick={() => setActiveTab("my")}>My Posts</button>
      </div>

      <div className="feed-content">
        {/* Stories Tray */}
        {activeTab === "feed" && <StoriesTray />}

        {/* Create Post Section */}
        <div className="create-post-card glass-card animate-in">
          <textarea 
            placeholder="Share something awesome..." 
            value={caption} 
            onChange={(e) => setcaption(e.target.value)} 
          />
          <div className="create-post-actions">
            <label htmlFor="media-upload" className="upload-btn">
              {image ? ((typeof image !== "string" && image.type && image.type.startsWith("video")) ? <FaVideo /> : <FaImage />) : <FaImage />}
              <span>{image ? (typeof image === "string" ? "Image Selected" : image.name) : "Add Media"}</span>
            </label>
            <input 
              type="file" 
              accept="image/*,video/*" 
              id="media-upload" 
              hidden 
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.type.startsWith("image/")) {
                  try {
                    const compressed = await compressImage(file, 1080, 1080, 0.8);
                    setimage(compressed);
                  } catch (err) {
                    console.error("Compression failed", err);
                  }
                } else {
                  setimage(file);
                }
                e.target.value = null;
              }} 
            />
            
            <button className="post-btn" onClick={handleaddpost} disabled={loadingUpload || !image || !caption.trim()}>
              {loadingUpload ? "Posting..." : "Post"}
            </button>
          </div>
        </div>

        {/* Feed List */}
        <div className="feed-list">
          {activeTab === "feed" && (
            <>
              {isLoadingAll ? renderSkeletons() : data?.pages.flat().map(post => <PostCard key={post._id} post={post} isMine={false} {...postCardProps} />)}
              {isFetchingNextPage && renderSkeletons()}
              <div ref={ref} />
            </>
          )}
          
          {activeTab === "my" && (
            <>
              {loadingMyPost ? renderSkeletons() : myposts.length === 0 ? <p className="empty-state-text">You haven't posted anything yet.</p> : myposts.map(post => <PostCard key={post._id} post={post} isMine={true} {...postCardProps} />)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
