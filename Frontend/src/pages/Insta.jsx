import { useEffect, useState } from "react";
import "./insta.css";
import { FaPlusSquare, FaTrash, FaEdit, FaCheck, FaHeart, FaRegHeart, FaUserAlt, FaUsers } from "react-icons/fa";
import { MdPermMedia } from "react-icons/md";
import {
  addpost,
  getmypost,
  deletepost,
  editpost,
  getallpost,
  likeorunlikepost,
  commentonpost
} from "../api/api";
import { FaCommentMedical } from "react-icons/fa";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Spinner } from "../Spinner";
import { FaRegComment } from "react-icons/fa";

const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";
const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");

export const Insta = () => {
  const [activeMenu, setActiveMenu] = useState("all");
  const [image, setimage] = useState(null);
  const [caption, setcaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [myposts, setMyposts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editCaption, setEditCaption] = useState("");
  const [commentInputs, setCommentInputs] = useState({});
  const [showComments, setShowComments] = useState({});
  const [loadingMyPost, setLoadingMyPost] = useState(false);
  const [loadingAllPost, setLoadingAllPost] = useState(false);

  const { ref, inView } = useInView();
  const queryClient = useQueryClient();

  const fetchPostsPage = async ({ pageParam = 1 }) => {
    try {
      setLoadingAllPost(true);
      const res = await fetch(`${BASE_URL}/insta/posts?page=${pageParam}`, {
        credentials: "include",
      });
      return await res.json();
    } catch (err) {
      console.error("Error fetching all posts:", err);
      throw err;
    } finally {
      setLoadingAllPost(false);
    }
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["all-posts"],
    queryFn: fetchPostsPage,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 10 ? allPages.length + 1 : undefined,
  });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const toggleComments = (postId) => {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

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
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", image);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const isVideo = image.type.startsWith("video/");
      const uploadUrl = isVideo
        ? "https://api.cloudinary.com/v1_1/dwzvlijky/video/upload"
        : "https://api.cloudinary.com/v1_1/dwzvlijky/image/upload";

      const res = await fetch(uploadUrl, { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      await addpost({ caption, image: data.secure_url });
      setcaption("");
      setimage(null);
      setActiveMenu("all");
      queryClient.invalidateQueries(["all-posts"]);
    } catch (err) {
      console.error("Error adding post:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletepost(id);
      setMyposts((prev) => prev.filter((post) => post._id !== id));
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
    } catch (err) {
      console.error(err);
    }
  };

  const handlelike = async (id) => {
    try {
      await likeorunlikepost(id);
      queryClient.invalidateQueries(["all-posts"]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (id) => {
    const text = commentInputs[id]?.trim();
    if (!text) return;
    try {
      await commentonpost({ id, text });
      setCommentInputs((prev) => ({ ...prev, [id]: "" }));
      queryClient.invalidateQueries(["all-posts"]);
    } catch (err) {
      console.error(err);
    }
  };

  const PostCard = ({ post, isMine }) => (
    <div className="postcard animate-in">
      <div className="postcard-header">
        <img src={post.user?.image || `${BASE_URL}/default-user.png`} alt="user" />
        <span>{post.user?.username || "Anonymous"}</span>
      </div>

      {post.image.includes(".mp4") ? (
        <video src={post.image} controls />
      ) : (
        <img src={post.image} alt="post content" />
      )}

      <div className="postcard-footer">
        <div className="action-bar">
          {post.likes.includes(localStorage.getItem("userId")) ? (
            <FaHeart onClick={() => handlelike(post._id)} className="like" />
          ) : (
            <FaRegHeart onClick={() => handlelike(post._id)} className="ll" />
          )}
          <FaRegComment onClick={() => toggleComments(post._id)} className="ll" />
        </div>

        <p className="likes-count">{post.likes?.length || 0} likes</p>

        {editingId === post._id ? (
          <div className="edit-area">
            <textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} />
            <FaCheck onClick={() => handleEdit(post._id)} className="icon confirm" />
          </div>
        ) : (
          <p className="caption"><strong>{post.user?.username}</strong> {post.caption}</p>
        )}

        {isMine && (
          <div className="mine-actions">
            <FaEdit onClick={() => { setEditingId(post._id); setEditCaption(post.caption); }} />
            <FaTrash onClick={() => handleDelete(post._id)} />
          </div>
        )}

        <div className="comment-section">
          <div className="comment-toggle" onClick={() => toggleComments(post._id)}>
            {post.comments?.length > 0 ? `View all ${post.comments.length} comments` : "No comments yet"}
          </div>

          {showComments[post._id] && (
            <div className="comments-list">
              {post.comments.map((c, i) => (
                <div key={i} className="comment-item">
                  <img src={c.user?.image || `${BASE_URL}/default-user.png`} alt="user" />
                  <p><strong>{c.user?.username}:</strong> {c.text}</p>
                </div>
              ))}
            </div>
          )}

          <div className="comment-input-group">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentInputs[post._id] || ""}
              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
            />
            <FaCommentMedical onClick={() => handleComment(post._id)} className="add-comment-btn" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {(loadingMyPost || loadingAllPost || loading) && <Spinner />}
      <div className="insta-page">
        <div className="semicircle-menu">
          <FaPlusSquare title="Create" onClick={() => setActiveMenu("add")} className="menu-icon" />
          <FaUsers title="Feed" onClick={() => setActiveMenu("all")} className="menu-icon" />
          <FaUserAlt title="My Posts" onClick={() => { setActiveMenu("my"); fetchMyPosts(); }} className="menu-icon" />
        </div>

        <div className="largecontainer">
          {activeMenu === "add" && (
            <div className="inputarea animate-in">
              <h2>Create New Post</h2>
              <input type="text" placeholder="What's on your mind?" value={caption} onChange={(e) => setcaption(e.target.value)} />
              <label htmlFor="upload" className="upload-label">
                <MdPermMedia className="imgg" />
                <span>{image ? image.name : "Select Media"}</span>
              </label>
              <input type="file" accept="image/*,video/*" id="upload" style={{ display: "none" }} onChange={(e) => setimage(e.target.files[0])} />
              <button className="addd" onClick={handleaddpost} disabled={loading}>
                {loading ? "Posting..." : "Post Now"}
              </button>
            </div>
          )}

          {activeMenu === "my" && (
            <div className="viewarea">
              <h1>My Posts</h1>
              {myposts.map(post => <PostCard key={post._id} post={post} isMine={true} />)}
            </div>
          )}

          {activeMenu === "all" && (
            <div className="showarea">
              <h1>Feed</h1>
              <div className="feed-grid">
                {data?.pages.flat().map(post => <PostCard key={post._id} post={post} isMine={false} />)}
              </div>
              {isFetchingNextPage && <p className="loading-more">Loading more...</p>}
              <div ref={ref} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
