import { useEffect, useState } from "react";
import "./Home.css";
import { Spinner } from "../Spinner";
import { FaArrowLeft, FaComments, FaLock } from "react-icons/fa";
import { login, signup, sendOtp, verifyOtp } from "../api/api";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

export const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(""); // 'success' or 'error'

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${BASE_URL}/verify-token`, {
          withCredentials: true,
        });
        if (res.data?.user?.username) {
          navigate("/myself");
        }
      } catch (err) {
        console.warn("User not logged in");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ email: formData.email, password: formData.password });
      localStorage.setItem("userId", res._id);
      navigate("/myself");
    } catch (err) {
      setStatus("erro");
      setMessage(err.response?.data || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      setStatus("succes");
      setMessage("Signup successful! You can now login.");
      setIsLogin(true);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Signup failed. Please try again.";
      setStatus("erro");
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendOtp(formData.forgotEmail);
      setStatus("succes");
      setMessage("OTP sent to your email.");
    } catch (err) {
      setStatus("erro");
      setMessage(err.response?.data || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp({
        otp: formData.otp,
        newPassword: formData.newPassword,
      });
      setStatus("succes");
      setMessage("Password reset successful. Please login.");
      setShowForgot(false);
    } catch (err) {
      setStatus("erro");
      setMessage(err.response?.data || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div className="d">
      {loading && <Spinner />}
      <div id="logo">
        <FaComments className="comm" />
        <span>Connectify</span>
      </div>

      <div className="container">
        <div className="toggle-buttons">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(true);
              setShowForgot(false);
              setMessage("");
            }}
          >
            Login
          </button>
          <button
            className={!isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(false);
              setShowForgot(false);
              setMessage("");
            }}
          >
            Signup
          </button>
        </div>

        {isLogin && !showForgot && (
          <div className="form-wrapper">
            <h2>Login to Connectify</h2>
            <p>Enter your credentials to access your account.</p>
            <form onSubmit={handleLogin}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                onChange={handleChange}
                required
              />
              <button type="submit">Login</button>
            </form>
            <div className="forgot" onClick={() => setShowForgot(true)}>
              Forgot Password?
            </div>
          </div>
        )}

        {!isLogin && (
          <div className="form-wrapper">
            <h2>Signup for Connectify</h2>
            <p>Create an account to connect with others.</p>
            <form onSubmit={handleSignup}>
              <input
                type="text"
                name="username"
                placeholder="Username"
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                onChange={handleChange}
                required
              />
              <button type="submit">Signup</button>
            </form>
          </div>
        )}

        {isLogin && showForgot && (
          <div className="form-wrapper">
            <FaArrowLeft className="back-arrow" onClick={() => setShowForgot(false)} />
            <h2>Forgot Password</h2>
            <form onSubmit={handleSendOtp}>
              <input
                type="email"
                name="forgotEmail"
                placeholder="Enter your email"
                onChange={handleChange}
                required
              />
              <button type="submit">Send OTP</button>
            </form>
            <h2>Verify OTP</h2>
            <form onSubmit={handleVerifyOtp}>
              <input
                type="text"
                name="otp"
                placeholder="Enter OTP"
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="newPassword"
                placeholder="Enter New Password"
                onChange={handleChange}
                required
              />
              <button type="submit">Reset Password</button>
            </form>
          </div>
        )}

        {message && <h4 className={`message ${status}`}>{message}</h4>}
      </div>

      <div id="footer">
        <FaLock className="lock-icon" />
        <p>Your personal messages are end-to-end encrypted</p>
      </div>
    </div>
  );
};
