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
import { IoIosCreate } from "react-icons/io";
import { FaCommentMedical } from "react-icons/fa";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";
import { Spinner } from "../Spinner"; // adjust the path if needed

import { FaRegComment } from "react-icons/fa";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export const Insta = () => {
  const [activeMenu, setActiveMenu] = useState(null); // 'add', 'my', 'all'
  const [image, setimage] = useState(null);
  const [caption, setcaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [myposts, setMyposts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editCaption, setEditCaption] = useState("");
  const [allpost, setallpost] = useState([]);
  const [commentInputs, setCommentInputs] = useState({});
  const BASE_URL = import.meta.env.VITE_API_URL; // or your backend URL
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

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  } finally {
    setLoadingAllPost(false);
  }
};

  const toggleComments = (postId) => {
    setShowComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
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
  }, [inView, hasNextPage]);




  const fetchMyPosts = async () => {
    try {
      const res = await getmypost();
      setMyposts(res);
    } catch (err) {
      console.error(err);
    }
  };


  const handleaddpost = async () => {
    if (!image || !caption.trim()) return;
    setActiveMenu(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", image);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const isVideo = image.type.startsWith("video/");
      const uploadUrl = isVideo
        ? "https://api.cloudinary.com/v1_1/dwzvlijky/video/upload"
        : "https://api.cloudinary.com/v1_1/dwzvlijky/image/upload";

      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      await addpost({ caption, image: data.secure_url });
      setcaption("");
      setimage(null);
      fetchAllPosts();
    } catch (err) {
      console.error("Error adding post:", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletepost(id);
      setMyposts((prev) => prev.filter((post) => post._id !== id));
    } catch (err) {
      console.error("Failed to delete post:", err);
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
      console.error("Failed to edit post:", err);
    }
  };

  const handlelike = async (id) => {
    try {
      await likeorunlikepost(id);
      queryClient.invalidateQueries(["all-posts"]); // triggers a refresh of the post list
    } catch (err) {
      console.error("Like error:", err);
    }
  };


  const handleComment = async (id) => {
    const text = commentInputs[id]?.trim();
    if (!text) return;

    try {
      await commentonpost({ id, text });
      setCommentInputs((prev) => ({ ...prev, [id]: "" }));
      fetchAllPosts();
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  return (
    <>
      <div className="semicircle-menu">
        <FaPlusSquare title="Create New Post" onClick={() => setActiveMenu((prev) => (prev === "add" ? null : "add"))} className="menu-icon" />
      <FaUsers
  title="View Others Posts"
  onClick={() => {
    setActiveMenu("all");
    queryClient.invalidateQueries(["all-posts"]);
  }}
  className="menu-icon"
/>

        <FaUserAlt
  title="View My Posts"
  onClick={() => {
    setActiveMenu("my");
    fetchMyPosts();
  }}
  className="menu-icon"
/>

      </div>

      <div className="largecontainer">
        
        {activeMenu === "add" && (
          <div className="inputarea">
              
            <input type="text" placeholder="Enter caption" value={caption} onChange={(e) => setcaption(e.target.value)} />
            <label htmlFor="upload"><MdPermMedia className="imgg" /></label>
            <input type="file" accept="image/*,video/*" id="upload" style={{ display: "none" }} onChange={(e) => setimage(e.target.files[0])} />
            <IoIosCreate title="Create" className="addd" onClick={handleaddpost} disabled={!caption.trim() || !image || loading} />
          </div>
        )}

        {loading && <p style={{ color: "black", marginTop: "45vh", fontWeight: "bolder" }}>Uploading Post, please wait...</p>}

        {activeMenu === "my" && (
          <>
          <div className="viewarea">
    <h1 style={{
        color: "black",
        textAlign: "center",
        marginBottom: "1rem"
      }}>
        My Posts
      </h1>
            {myposts.length === 0 ? (
              <p style={{ color: "white",display:"flex",justifyContent:"center",alignItems:"center" ,display:"none"}}></p>
            ) : (
              myposts.map((post) => (
                <div key={post._id} className="postcard">
                  {post.image.includes(".mp4") ? (
                    <video src={post.image} controls width="300" />
                  ) : (
                    <img src={post.image} alt="post" width="300" />
                  )}

                  {editingId === post._id ? (
                    <>
                      <textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} style={{ margin: "10px", width: "100%", height: "60px", resize: "none" }} />
                      <FaCheck onClick={() => handleEdit(post._id)} className="icon confirm" title="Save" />
                    </>
                  ) : (
                    <>

                      <p style={{ color: "white", padding: "10px" ,maxWidth: "400px", // or any suitable width
  wordBreak: "break-word",}}>{post.caption}</p>
                      <div style={{ display: "flex", gap: "2rem" }}>  <p style={{ color: "lightgreen", fontWeight: "bold" }}>❤️<br></br> {post.likes?.length || 0} </p>
                        <p style={{ color: "lightgreen", fontWeight: "bold", marginTop: "14px" }}> <FaRegComment /> <br></br>  {post.comments?.length || 0}</p>
                      </div>

                      <div style={{ marginTop: "10px" }}>
                        <div
                          onClick={() => toggleComments(post._id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer",
                            color: "#ccc",
                            marginBottom: "5px"
                          }}
                        >
                          <h4 style={{ marginRight: "8px" }}>Comments</h4>
                          {showComments[post._id] ? <FaChevronUp /> : <FaChevronDown />}
                        </div>

                        {showComments[post._id] && (
                          <>
                            {post.comments?.length > 0 ? (
                              post.comments.map((c, i) => (
                                <div key={i} style={{ display: "flex" }}>
                                  {c.user?.image && (
                                    <img
                                      src={c.user.image}
                                      alt="User"
                                      style={{
                                        borderRadius: "50%",
                                        height: "30px",
                                        width: "30px",
                                        marginRight: "8px",
                                        marginTop: "7px",
                                        objectFit: "cover",
                                      }}
                                    />
                                  )}
                                  <p style={{ color: "lightgray",maxWidth: "400px", // or any suitable width
  wordBreak: "break-word", fontSize: "0.9rem" }}>
                                    <strong style={{maxWidth: "400px", // or any suitable width
  wordBreak: "break-word"}}>{c.user?.username || "Anonymous"}:</strong> {c.text}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p style={{ color: "gray", fontSize: "0.9rem" }}>No comments yet</p>
                            )}
                          </>
                        )}

                      </div>
                    </>
                  )}

                  <div style={{ display: "flex", gap: "10px" }}>
                    <FaEdit className="icon edit" title="Edit" onClick={() => { setEditingId(post._id); setEditCaption(post.caption); }} />
                    <FaTrash className="icon delete" title="Delete" onClick={() => handleDelete(post._id)} />
                  </div>
                </div>
              ))
            )}
          </div>
       </> )}

        {activeMenu === "all" && (
          <div className="showarea">
            <h1 style={{  textAlign: "center"}}>All Posts</h1>
            <ul className="showall-grid">
              {data?.pages.flat().map((cur) => (

                <li key={cur._id} className="showall">
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    {cur.user?.image && (
                      <img
                        src={cur.user.image}
                        alt="User"
                        style={{
                          width: "35px",
                          height: "35px",
                          borderRadius: "50%",
                          marginRight: "10px",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <span style={{ color: "white", maxWidth: "400px", // or any suitable width
  wordBreak: "break-word",fontWeight: "bold", fontSize: "1rem",marginTop:"2rem",marginLeft:"0rem" ,position:"relative",top:"-15px"}}>
                      {cur.user?.username || "Anonymous"}
                    </span>
                  </div>
                  {cur.image.includes(".mp4") ? (
                    <video src={cur.image} controls width="300" />
                  ) : (
                    <img src={cur.image} alt="post" width="300" />
                  )}
                  <h3 style={{ color: "white" ,maxWidth: "400px", // or any suitable width
  wordBreak: "break-word",}}>{cur.caption}</h3>
                  {cur.likes.includes(localStorage.getItem("userId")) ? (
                    <FaHeart onClick={() => handlelike(cur._id)} className="like" />
                  ) : (
                    <FaRegHeart onClick={() => handlelike(cur._id)} className="ll" />
                  )}
                  <div style={{ display: "flex", gap: "2rem" }}>  <p style={{ color: "lightgreen", fontWeight: "bold" }}>❤️<br></br> {cur.likes?.length || 0} </p>
                    <p style={{ color: "lightgreen", fontWeight: "bold", marginTop: "14px" }}> <FaRegComment /> <br></br>  {cur.comments?.length || 0}</p>
                  </div>

                  <div className="comment-section">
                    <input
                      type="text"
                      value={commentInputs[cur._id] || ""}
                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [cur._id]: e.target.value }))}
                      placeholder="Add a comment"
                      style={{ width: "90%", padding: "5px", marginTop: "5px",fontWeight:"bolder" }}
                    />
                   
                    <FaCommentMedical className="adddd"style={{fontSize:"2rem"}} onClick={() => handleComment(cur._id)} />
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    <div
                      onClick={() => toggleComments(cur._id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        color: "#ccc",
                        marginBottom: "5px"
                      }}
                    >
                      <h4 style={{ marginRight: "8px" }}>Comments</h4>
                      {showComments[cur._id] ? <FaChevronUp /> : <FaChevronDown />}
                    </div>

                    {showComments[cur._id] && (
                      <>
                        {cur.comments?.length > 0 ? (
                          cur.comments.map((c, i) => (
                            <div key={i} style={{ display: "flex" }}>
                              {c.user?.image && (
                                <img
                                  src={c.user.image}
                                  alt="User"
                                  style={{
                                    borderRadius: "50%",
                                    height: "30px",
                                    width: "30px",
                                    marginRight: "8px",
                                    marginTop: "7px",
                                    objectFit: "cover",
                                  }}
                                />
                              )}
                              <p style={{ color: "lightgray", maxWidth: "400px", // or any suitable width
  wordBreak: "break-word",fontSize: "0.9rem" }}>
                                <strong>{c.user?.username || "Anonymous"}:</strong> {c.text}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p style={{ color: "gray", fontSize: "0.9rem" }}>No comments yet</p>
                        )}
                      </>
                    )}

                  </div>
                </li>
              ))}
              {isFetchingNextPage && (
                <p style={{ color: "white", marginTop: "10px" }}>Loading more posts...</p>
              )}
              <div ref={ref} style={{ height: "1px" }}></div>

            </ul>
          </div>
        )}
      </div>
    </>
  );
}; 
