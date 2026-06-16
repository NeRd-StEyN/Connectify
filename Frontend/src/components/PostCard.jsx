import React from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart, FaRegComment, FaEdit, FaTrash, FaCheck, FaFlag } from "react-icons/fa";

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
const DEFAULT_IMAGE = `${BASE_URL}/default-photo.png`;

export const PostCard = ({ 
  post, 
  isMine, 
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
}) => (
  <div className="feed-card animate-in">
    <div className="feed-header">
      <Link to={`/user/${post.user?._id}`} className="feed-header-user">
        <img
          src={post.user?.image && !post.user.image.includes('undefined') ? post.user.image : DEFAULT_IMAGE}
          alt="user"
          onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
          className="feed-avatar"
        />
        <span className="feed-username">{post.user?.username || "Anonymous"}</span>
      </Link>
      {isMine && (
        <div className="feed-actions">
          <button onClick={() => { setEditingId(post._id); setEditCaption(post.caption); }}><FaEdit /></button>
          <button onClick={() => handleDelete(post._id)} className="delete-btn"><FaTrash /></button>
        </div>
      )}
    </div>

    <div className="feed-media">
      {post.image.includes(".mp4") ? (
        <video src={post.image} controls />
      ) : (
        <img src={post.image} alt="post" />
      )}
    </div>

    <div className="feed-footer">
      <div className="interaction-bar">
        <button className={`like-btn ${post.likes.includes(currentUserId) ? 'liked' : ''}`} onClick={() => handlelike(post._id)}>
          {post.likes.includes(currentUserId) ? <FaHeart /> : <FaRegHeart />}
        </button>
        <button className="comment-btn" onClick={() => toggleComments(post._id)}>
          <FaRegComment />
        </button>
        {!isMine && (
          <button 
            className="report-btn"
            onClick={() => handleReport(post._id)} 
            title="Report Post"
            style={{ marginLeft: 'auto', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <FaFlag />
          </button>
        )}
      </div>

      <p className="likes-count">{post.likes?.length || 0} likes</p>

      {editingId === post._id ? (
        <div className="edit-caption-box">
          <textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} />
          <button onClick={() => handleEdit(post._id)} className="save-btn"><FaCheck /> Save</button>
        </div>
      ) : (
        <p className="post-caption">
          <span className="caption-username">{post.user?.username}</span> {post.caption}
        </p>
      )}

      <div className="comment-section">
        {post.comments?.length > 0 && (
          <p className="view-comments" onClick={() => toggleComments(post._id)}>
            {showComments[post._id] ? "Hide comments" : `View all ${post.comments.length} comments`}
          </p>
        )}

        {showComments[post._id] && (
          <div className="comments-list">
            {post.comments.map((c, i) => (
              <div key={i} className="comment-item">
                <strong>{c.user?.username}</strong> {c.text}
              </div>
            ))}
          </div>
        )}

        <form className="comment-input-form" onSubmit={(e) => handleComment(post._id, e)}>
          <input
            type="text"
            placeholder="Add a comment..."
            value={commentInputs[post._id] || ""}
            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
          />
          <button type="submit" disabled={!commentInputs[post._id]?.trim()}>Post</button>
        </form>
      </div>
    </div>
  </div>
);
