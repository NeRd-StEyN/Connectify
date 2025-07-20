import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./chatbox.css";
import { IoSend } from "react-icons/io5";
import { FaSmile } from "react-icons/fa";
import { FaImages } from "react-icons/fa6";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { encryptText, decryptText } from "../utils/encryption";

const BASE_URL = import.meta.env.VITE_API_URL;

const socket = io(BASE_URL, { withCredentials: true });

export const ChatBox = ({ friend, sidebarOpen }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef(null);

  const userId = localStorage.getItem("userId");

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result); // base64
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  useEffect(() => {
    if (!friend?._id || !userId) return;

    socket.emit("register", userId);

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/messages/${friend._id}`, {
          withCredentials: true,
        });
        setMessages(res.data);
      } catch (err) {
        console.error("Fetch failed", err);
      }
    };

    fetchMessages();

    socket.on("receive-message", (msg) => {
      if (msg.sender === friend._id || msg.recipient === friend._id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.off("receive-message");
  }, [friend]);

  const sendMessage = async () => {
    if ((!text || [...text].filter((c) => c.trim() !== "").length === 0) && !image) return;

    const encryptedText = encryptText(text);

    const msg = {
      sender: userId,
      recipient: friend._id,
      content: encryptedText,
      image,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, msg]);
    socket.emit("send-message", { to: friend._id, message: msg });

    try {
      await axios.post(
        `${BASE_URL}/send-message`,
        {
          recipientId: friend._id,
          content: encryptedText,
          image,
        },
        { withCredentials: true }
      );
    } catch (err) {
      console.error("Send failed", err);
    }

    setText("");
    setImage(null);
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chatbox-container">
      <div className={`uu ${sidebarOpen ? "ope" : "clos"}`}>
        <img src={friend.image} alt="friend" />
        <h3 style={{ color: "black", fontWeight: "bolder", fontSize: "1.5rem" }}>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{friend.username}
        </h3>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => {
          const decryptedText = decryptText(msg.content || "");
          return (
            <div
              key={i}
              className={msg.sender === userId ? "messa outgoing" : "messa incoming"}
            >
              <p className={msg.sender === userId ? "out" : "in"}>
                {msg.image && (
                  <img
                    src={msg.image}
                    className="im"
                    alt="sent"
                    style={{ maxWidth: "200px", marginTop: "10px", borderRadius: "10px" }}
                  />
                )}
                {msg.image && <br />}
                {decryptedText}
              </p>
            </div>
          );
        })}
        <div ref={scrollRef}></div>
      </div>

      <div className="chat-input">
        <input
          value={text}
          className="inpu"
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />

        <label htmlFor="sendimage">
          <FaImages className="send" />
        </label>
        <input
          type="file"
          onChange={handleImageUpload}
          accept="image/*"
          id="sendimage"
          style={{ display: "none" }}
        />

        <FaSmile className="smile" onClick={() => setShowEmojiPicker((prev) => !prev)} />

        {showEmojiPicker && (
          <div
            style={{
              position: "absolute",
              bottom: "80px",
              right: "20px",
              zIndex: 1000,
            }}
          >
            <Picker
              data={data}
              onEmojiSelect={(emoji) => setText((prev) => prev + emoji.native)}
              theme="dark"
            />
          </div>
        )}

        <IoSend className="send" onClick={sendMessage} />
      </div>
    </div>
  );
};
