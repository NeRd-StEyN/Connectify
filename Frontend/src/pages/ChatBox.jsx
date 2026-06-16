import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import "./chatbox.css";
import { FaPaperclip, FaSmile, FaRegTimesCircle, FaPaperPlane, FaEllipsisV, FaReply, FaChevronDown, FaArrowDown, FaMicrophone, FaStop, FaImages, FaCheck, FaCheckDouble, FaTrash, FaSearch, FaTimes } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import { MdOutlineKeyboardArrowDown } from "react-icons/md";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { encryptText, decryptText } from "./encryption";
import { compressImage } from "../utils/imageCompression";

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
const DEFAULT_IMAGE = `${BASE_URL}/default-photo.png`;

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

function formatMessageTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateDivider(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function shouldShowDivider(messages, index) {
  if (index === 0) return true;
  const prev = new Date(messages[index - 1].timestamp);
  const curr = new Date(messages[index].timestamp);
  return prev.toDateString() !== curr.toDateString();
}

export const ChatBox = ({ friend, socket, typingUsers, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, messageId, isMine }
  const [reactionPicker, setReactionPicker] = useState(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [scrollAtBottom, setScrollAtBottom] = useState(true);

  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const oldestTimestampRef = useRef(null);

  const userId = localStorage.getItem("userId");
  const isTyping = typingUsers && typingUsers.has(friend?._id);

  // ── Fetch messages ──────────────────────────────────────────
  const fetchMessages = useCallback(async (before = null) => {
    if (!friend?._id || !userId) return;
    try {
      const params = { limit: 50 };
      if (before) params.before = before;
      const res = await axios.get(`${BASE_URL}/messages/${friend._id}`, {
        withCredentials: true,
        params,
      });
      const rawMsgs = res.data.messages || res.data;
      const msgs = rawMsgs.map(m => ({
        ...m,
        content: decryptText(m.content || ""),
        replyTo: m.replyTo ? { ...m.replyTo, content: decryptText(m.replyTo.content || "") } : m.replyTo
      }));

      if (before) {
        setMessages(prev => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
      }
      setHasMore(res.data.hasMore ?? msgs.length === 50);
      if (msgs.length > 0) {
        oldestTimestampRef.current = msgs[0].timestamp;
      }
      // Notify sender we read their messages
      if (socket) {
        socket.emit("mark-read", { to: friend._id, from: userId });
      }
    } catch (err) {
      console.error("Fetch failed", err);
    }
  }, [friend, userId, socket]);

  useEffect(() => {
    if (!friend?._id || !userId || !socket) return;
    setMessages([]);
    setHasMore(true);
    setReplyTo(null);
    setSearchQuery("");
    setShowSearch(false);
    fetchMessages();
  }, [friend, userId, socket]);

  // ── Receive message via socket ─────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const receiveMessageHandler = (msg) => {
      if (msg.sender === friend._id || msg.recipient === friend._id) {
        const decryptedMsg = { 
          ...msg, 
          content: decryptText(msg.content || ""),
          replyTo: msg.replyTo ? { ...msg.replyTo, content: decryptText(msg.replyTo.content || "") } : msg.replyTo
        };
        setMessages((prev) => [...prev, decryptedMsg]);
        // Mark as read immediately if chat is open
        if (socket) socket.emit("mark-read", { to: friend._id, from: userId });
      }
    };
    socket.on("receive-message", receiveMessageHandler);
    return () => socket.off("receive-message", receiveMessageHandler);
  }, [socket, friend, userId]);

  // ── Read receipts from friend ──────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleMessagesRead = ({ by }) => {
      if (by === friend._id) {
        setMessages(prev => prev.map(m =>
          m.sender === userId ? { ...m, read: true } : m
        ));
      }
    };
    socket.on("messages-read", handleMessagesRead);
    return () => socket.off("messages-read", handleMessagesRead);
  }, [socket, friend, userId]);

  // ── Message deleted by friend ──────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleDeleted = ({ messageId, deleteFor }) => {
      if (deleteFor === "everyone") {
        setMessages(prev => prev.map(m =>
          m._id === messageId ? { ...m, content: "", image: undefined, deleted: true } : m
        ));
      }
    };
    socket.on("message-deleted", handleDeleted);
    return () => socket.off("message-deleted", handleDeleted);
  }, [socket]);

  // ── Reactions from friend ──────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleReaction = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, reactions } : m
      ));
    };
    socket.on("message-reaction", handleReaction);
    return () => socket.off("message-reaction", handleReaction);
  }, [socket]);

  // ── Auto-scroll ────────────────────────────────────────────
  useEffect(() => {
    if (scrollAtBottom) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, scrollAtBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setScrollAtBottom(atBottom);
    // Load older messages when scrolled to top
    if (el.scrollTop < 80 && hasMore && !loadingOlder) {
      loadOlderMessages();
    }
  };

  const loadOlderMessages = async () => {
    if (!hasMore || loadingOlder) return;
    setLoadingOlder(true);
    const el = containerRef.current;
    const prevScrollHeight = el?.scrollHeight;
    await fetchMessages(oldestTimestampRef.current);
    setLoadingOlder(false);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    }
  };

  // ── Typing ─────────────────────────────────────────────────
  const handleTyping = (e) => {
    setText(e.target.value);
    if (socket) {
      socket.emit("typing", { to: friend._id, from: userId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", { to: friend._id, from: userId });
      }, 2000);
    }
  };

  // ── Image upload ───────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 800, 800, 0.7);
        setImage(compressedBase64);
      } catch (err) {
        console.error("Compression failed", err);
      }
    }
    e.target.value = null;
  };

  // ── Audio Recording ──────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    setAudioBlob(null);
    setAudioUrl(null);
  };

  // ── Send ───────────────────────────────────────────────────
  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed && !image && !audioBlob) return;

    if (socket) socket.emit("stop-typing", { to: friend._id, from: userId });

    const encryptedText = trimmed ? encryptText(trimmed) : "";

    let audioBase64 = null;
    if (audioBlob) {
      audioBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(audioBlob);
      });
    }

    const optimisticMsg = {
      _id: `temp_${Date.now()}`,
      sender: userId,
      recipient: friend._id,
      content: trimmed,
      image,
      audio: audioBase64,
      timestamp: new Date(),
      read: false,
      replyTo: replyTo || null,
      _sending: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setText("");
    setImage(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setReplyTo(null);
    setScrollAtBottom(true);

    try {
      const res = await axios.post(
        `${BASE_URL}/send-message`,
        {
          recipientId: friend._id,
          content: encryptedText,
          image,
          audio: audioBase64,
          replyTo: replyTo?._id || null,
        },
        { withCredentials: true }
      );

      // Replace optimistic with real message
      setMessages(prev => prev.map(m =>
        m._id === optimisticMsg._id
          ? { ...res.data, content: trimmed, replyTo: m.replyTo }
          : m
      ));

      if (socket) {
        socket.emit("send-message", {
          to: friend._id,
          message: { ...res.data, content: encryptedText },
        });
      }
    } catch (err) {
      console.error("Send failed", err);
      setMessages(prev => prev.map(m =>
        m._id === optimisticMsg._id ? { ...m, _failed: true } : m
      ));
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const deleteMessage = async (messageId, deleteFor) => {
    setContextMenu(null);
    const msg = messages.find(m => m._id === messageId);
    if (!msg) return;

    setMessages(prev => prev.map(m =>
      m._id === messageId
        ? deleteFor === "everyone"
          ? { ...m, content: "", image: undefined, deleted: true }
          : { ...m, _hiddenForMe: true }
        : m
    ));

    try {
      await axios.delete(`${BASE_URL}/messages/${messageId}`, {
        data: { deleteFor },
        withCredentials: true,
      });
      if (socket && deleteFor === "everyone") {
        socket.emit("delete-message", { to: friend._id, messageId, deleteFor });
      }
      if (deleteFor === "me") {
        setMessages(prev => prev.filter(m => m._id !== messageId));
      }
    } catch (err) {
      console.error("Delete failed", err);
      setMessages(prev => prev.map(m =>
        m._id === messageId ? msg : m
      ));
    }
  };

  // ── React ──────────────────────────────────────────────────
  const sendReaction = async (messageId, emoji) => {
    setReactionPicker(null);
    setMessages(prev => prev.map(m => {
      if (m._id !== messageId) return m;
      const reactions = { ...(m.reactions || {}) };
      if (reactions[userId] === emoji) {
        delete reactions[userId];
      } else {
        reactions[userId] = emoji;
      }
      return { ...m, reactions };
    }));

    try {
      const res = await axios.post(
        `${BASE_URL}/messages/${messageId}/react`,
        { emoji },
        { withCredentials: true }
      );
      if (socket) {
        socket.emit("react-message", { to: friend._id, messageId, reactions: res.data.reactions });
      }
    } catch (err) {
      console.error("React failed", err);
    }
  };

  // ── Context menu ───────────────────────────────────────────
  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    if (msg._sending || msg.deleted || msg._hiddenForMe) return;
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 160),
      messageId: msg._id,
      isMine: msg.sender === userId,
      msg,
    });
  };

  useEffect(() => {
    const close = () => { setContextMenu(null); setReactionPicker(null); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // ── Filtered messages ──────────────────────────────────────
  const filteredMessages = searchQuery
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="chatbox-container">
      {/* Header */}
      <div className="chatbox-header">
        {onBack && (
          <button className="back-btn-mobile" onClick={onBack}>
            &#8592;
          </button>
        )}
        <img
          src={friend.image && !friend.image.includes("undefined") ? friend.image : DEFAULT_IMAGE}
          alt={friend.username}
          onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
          className="chatbox-header-avatar"
        />
        <div className="chatbox-header-info">
          <h3>{friend.username}</h3>
          <span className={`chatbox-status ${isTyping ? "typing-status" : ""}`}>
            {isTyping ? "typing..." : ""}
          </span>
        </div>
        <button
          className={`chatbox-search-btn ${showSearch ? "active" : ""}`}
          onClick={() => setShowSearch(s => !s)}
          title="Search messages"
        >
          {showSearch ? <FaTimes /> : <FaSearch />}
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="chatbox-search-bar">
          <FaSearch />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <span className="search-count">
              {filteredMessages.length} result{filteredMessages.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        className="chat-messages"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {loadingOlder && (
          <div className="loading-older">Loading older messages...</div>
        )}
        {hasMore && !loadingOlder && (
          <div className="load-older-btn-wrap">
            <button className="load-older-btn" onClick={loadOlderMessages}>
              <MdOutlineKeyboardArrowDown /> Load older messages
            </button>
          </div>
        )}

        {filteredMessages.filter(m => !m._hiddenForMe).map((msg, i) => {
          const isMine = msg.sender === userId;
          const decrypted = msg.content || "";
          const showDivider = !searchQuery && shouldShowDivider(filteredMessages, i);
          const reactions = msg.reactions || {};
          const reactionGroups = {};
          Object.values(reactions).forEach(e => {
            reactionGroups[e] = (reactionGroups[e] || 0) + 1;
          });

          return (
            <div key={msg._id || i}>
              {showDivider && (
                <div className="date-divider">
                  <span>{formatDateDivider(msg.timestamp)}</span>
                </div>
              )}

              <div
                className={`message-row ${isMine ? "outgoing" : "incoming"}`}
                onContextMenu={(e) => handleContextMenu(e, msg)}
              >
                {!isMine && (
                  <img
                    src={friend.image && !friend.image.includes("undefined") ? friend.image : DEFAULT_IMAGE}
                    alt=""
                    className="msg-avatar"
                    onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
                  />
                )}

                <div className="message-bubble-wrap">
                  {/* Reply context */}
                  {msg.replyTo && (
                    <div className="reply-preview-bubble">
                      <span className="reply-preview-text">
                        {msg.replyTo.image ? "📷 Photo" : (msg.replyTo.content || "").slice(0, 60)}
                      </span>
                    </div>
                  )}

                  <div className={`message-bubble ${isMine ? "bubble-out" : "bubble-in"} ${msg.deleted ? "deleted-msg" : ""} ${msg._failed ? "failed-msg" : ""} ${msg._sending ? "sending-msg" : ""}`}>
                    {msg.deleted ? (
                      <em className="deleted-label">🚫 Message deleted</em>
                    ) : (
                      <>
                        {msg.image && (
                          <img src={msg.image} className="msg-image" alt="sent" />
                        )}
                        {msg.audio && (
                          <audio src={msg.audio} controls className="msg-audio" />
                        )}
                        {decrypted && <p>{decrypted}</p>}
                      </>
                    )}
                  </div>

                  {/* Reactions */}
                  {Object.keys(reactionGroups).length > 0 && (
                    <div className={`reactions-row ${isMine ? "reactions-out" : "reactions-in"}`}>
                      {Object.entries(reactionGroups).map(([emoji, count]) => (
                        <span
                          key={emoji}
                          className={`reaction-chip ${reactions[userId] === emoji ? "my-reaction" : ""}`}
                          onClick={() => sendReaction(msg._id, emoji)}
                          title={`${count} reaction${count > 1 ? "s" : ""}`}
                        >
                          {emoji} {count > 1 ? count : ""}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="message-meta">
                    <span className="msg-time">{formatMessageTime(msg.timestamp)}</span>
                    {isMine && !msg.deleted && (
                      <span className={`read-tick ${msg.read ? "read" : ""}`}>
                        {msg.read ? <FaCheckDouble /> : <FaCheck />}
                      </span>
                    )}
                    {msg._failed && <span className="fail-label">⚠️ Failed</span>}
                  </div>
                </div>

                {/* Hover Actions */}
                {!msg.deleted && !msg._sending && (
                  <div className={`msg-hover-actions ${isMine ? "actions-out" : "actions-in"}`}>
                    <button onClick={() => setReplyTo(msg)} title="Reply"><FaReply /></button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setReactionPicker(msg._id); }}
                      title="React"
                    >
                      <FaSmile />
                    </button>
                    {isMine && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleContextMenu(e, msg); }}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                )}

                {/* Quick reaction picker */}
                {reactionPicker === msg._id && (
                  <div
                    className={`quick-reactions ${isMine ? "qr-out" : "qr-in"}`}
                    onClick={e => e.stopPropagation()}
                  >
                    {QUICK_REACTIONS.map(emoji => (
                      <button key={emoji} onClick={() => sendReaction(msg._id, emoji)}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="message-row incoming">
            <img
              src={friend.image && !friend.image.includes("undefined") ? friend.image : DEFAULT_IMAGE}
              alt=""
              className="msg-avatar"
              onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
            />
            <div className="typing-bubble">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Scroll to bottom fab */}
      {!scrollAtBottom && (
        <button
          className="scroll-to-bottom"
          onClick={() => {
            setScrollAtBottom(true);
            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          ↓
        </button>
      )}

      {/* Reply Bar */}
      {replyTo && (
        <div className="reply-bar">
          <div className="reply-bar-content">
            <FaReply className="reply-bar-icon" />
            <span>{replyTo.image ? "📷 Photo" : (replyTo.content || "").slice(0, 60)}</span>
          </div>
          <button onClick={() => setReplyTo(null)}><FaTimes /></button>
        </div>
      )}

      {/* Image preview */}
      {image && (
        <div className="image-preview-bar">
          <img src={image} alt="preview" />
          <button onClick={() => setImage(null)}><FaTimes /></button>
        </div>
      )}

      {/* Audio preview */}
      {audioUrl && !isRecording && (
        <div className="audio-preview-bar">
          <audio src={audioUrl} controls className="audio-preview" />
          <button onClick={cancelRecording}><FaTimes /></button>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-bar">
        <label htmlFor="sendimage" className="input-icon-btn" title="Send image">
          <FaImages />
        </label>
        <input
          type="file"
          onChange={handleImageUpload}
          accept="image/*"
          id="sendimage"
          style={{ display: "none" }}
        />

        <button
          className="input-icon-btn"
          onClick={() => setShowEmojiPicker(p => !p)}
          title="Emoji"
        >
          <FaSmile />
        </button>

        {showEmojiPicker && (
          <div className="emoji-picker-wrap">
            <Picker
              data={data}
              onEmojiSelect={(emoji) => { setText(p => p + emoji.native); setShowEmojiPicker(false); }}
              theme="dark"
            />
          </div>
        )}

        {isRecording ? (
          <div className="recording-indicator">
            <span className="recording-pulse"></span>
            <span>Recording audio...</span>
            <button className="stop-record-btn" onClick={stopRecording}>
              <FaStop />
            </button>
          </div>
        ) : (
          <input
            value={text}
            className="chat-text-input"
            onChange={handleTyping}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
        )}

        {!text.trim() && !image && !audioBlob && !isRecording ? (
          <button className="mic-btn" onClick={startRecording} title="Record voice message">
            <FaMicrophone />
          </button>
        ) : (
          <button className="send-btn" onClick={sendMessage} disabled={(!text.trim() && !image && !audioBlob) || isRecording}>
            <IoSend />
          </button>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }}>
            <FaReply /> Reply
          </button>
          <button onClick={() => deleteMessage(contextMenu.messageId, "me")}>
            <FaTrash /> Delete for me
          </button>
          {contextMenu.isMine && (
            <button className="danger" onClick={() => deleteMessage(contextMenu.messageId, "everyone")}>
              <FaTrash /> Delete for everyone
            </button>
          )}
        </div>
      )}
    </div>
  );
};
