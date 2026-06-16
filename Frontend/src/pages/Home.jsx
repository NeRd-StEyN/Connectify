import { useEffect, useState } from "react";
import "./Home.css";
import { Spinner } from "../Spinner";
import { FaArrowLeft, FaComments, FaLock, FaBolt, FaUserFriends, FaImage, FaShieldAlt, FaCheckCircle } from "react-icons/fa";
import { login, signup, sendOtp, verifyOtp } from "../api/api";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");

const FEATURES = [
  { icon: <FaBolt />, title: "Real-time Chat", desc: "Instant messaging with typing indicators and online status" },
  { icon: <FaUserFriends />, title: "Friend Network", desc: "Discover and connect with people around the world" },
  { icon: <FaImage />, title: "Rich Feed", desc: "Share photos and videos with your friends" },
  { icon: <FaShieldAlt />, title: "End-to-End Encrypted", desc: "Your private messages are protected with AES encryption" },
];

export const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${BASE_URL}/verify-token`, { withCredentials: true });
        if (res.data?.user?.username) navigate("/myself");
      } catch {
        // not logged in
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const showMsg = (msg, type) => {
    setStatus(type);
    setMessage(msg);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ email: formData.email, password: formData.password });
      localStorage.setItem("userId", res._id);
      navigate("/myself");
    } catch (err) {
      showMsg(err.response?.data?.message || err.response?.data || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password.length < 6) {
      return showMsg("Password must be at least 6 characters", "error");
    }
    setLoading(true);
    try {
      await signup({ username: formData.username, email: formData.email, password: formData.password });
      showMsg("Account created! You can now login.", "success");
      setIsLogin(true);
    } catch (err) {
      showMsg(err.response?.data?.message || "Signup failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendOtp(formData.forgotEmail);
      showMsg("OTP sent to your email.", "success");
    } catch (err) {
      showMsg(err.response?.data || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp({ email: formData.forgotEmail, otp: formData.otp, newPassword: formData.newPassword });
      showMsg("Password reset! Please login.", "success");
      setShowForgot(false);
    } catch (err) {
      showMsg(err.response?.data || "OTP verification failed", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div className="home-page">
      {loading && <Spinner />}

      {/* ── Animated background ── */}
      <div className="home-bg">
        <div className="home-orb orb-1" />
        <div className="home-orb orb-2" />
        <div className="home-orb orb-3" />
      </div>

      {/* ── Navbar ── */}
      <nav className="home-nav">
        <div className="home-nav-logo">
          <FaComments className="nav-logo-icon" />
          <span>Connectify</span>
        </div>
        <div className="home-nav-actions">
          <span className="nav-badge"><FaLock /> Encrypted</span>
        </div>
      </nav>

      <div className="home-layout">
        {/* ── Left: Hero ── */}
        <div className="hero-section">
          <div className="hero-badge">
            <FaBolt /> New · Real-time messaging
          </div>
          <h1 className="hero-title">
            Connect with the<br />
            <span className="gradient-text">world around you</span>
          </h1>
          <p className="hero-desc">
            Connectify brings you instant messaging, a social feed, and friend discovery — all in one beautiful, encrypted platform.
          </p>

          <div className="feature-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <span className="feature-icon">{f.icon}</span>
                <div>
                  <strong>{f.title}</strong>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hero-stats">
            <div className="stat">
              <strong>100%</strong>
              <span>Private</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <strong>0ms</strong>
              <span>Latency</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <strong>∞</strong>
              <span>Friends</span>
            </div>
          </div>
        </div>

        {/* ── Right: Auth Card ── */}
        <div className="auth-section">
          <div className="auth-card glass-card animate-in">
            {!showForgot ? (
              <>
                <div className="auth-tabs">
                  <button
                    className={isLogin ? "active" : ""}
                    onClick={() => { setIsLogin(true); setMessage(""); }}
                  >
                    Sign In
                  </button>
                  <button
                    className={!isLogin ? "active" : ""}
                    onClick={() => { setIsLogin(false); setMessage(""); }}
                  >
                    Sign Up
                  </button>
                </div>

                {isLogin ? (
                  <div className="auth-form-wrap">
                    <h2>Welcome back 👋</h2>
                    <p className="auth-subtitle">Sign in to your account to continue</p>
                    <form onSubmit={handleLogin} className="auth-form">
                      <div className="input-group">
                        <label>Email</label>
                        <input
                          type="email"
                          name="email"
                          placeholder="you@example.com"
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label>Password</label>
                        <div className="password-wrap">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="••••••••"
                            onChange={handleChange}
                            required
                          />
                          <button
                            type="button"
                            className="show-pw-btn"
                            onClick={() => setShowPassword(p => !p)}
                          >
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>
                      <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                      </button>
                    </form>
                    <div className="forgot-link" onClick={() => { setShowForgot(true); setMessage(""); }}>
                      Forgot your password?
                    </div>
                  </div>
                ) : (
                  <div className="auth-form-wrap">
                    <h2>Create an account ✨</h2>
                    <p className="auth-subtitle">Join thousands of people on Connectify</p>
                    <form onSubmit={handleSignup} className="auth-form">
                      <div className="input-group">
                        <label>Username</label>
                        <input
                          type="text"
                          name="username"
                          placeholder="your_username"
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label>Email</label>
                        <input
                          type="email"
                          name="email"
                          placeholder="you@example.com"
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label>Password</label>
                        <div className="password-wrap">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="Min. 6 characters"
                            onChange={handleChange}
                            required
                          />
                          <button
                            type="button"
                            className="show-pw-btn"
                            onClick={() => setShowPassword(p => !p)}
                          >
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>
                      <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? "Creating account..." : "Create Account"}
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="auth-form-wrap">
                <button className="back-btn" onClick={() => { setShowForgot(false); setMessage(""); }}>
                  <FaArrowLeft /> Back to login
                </button>
                <h2>Reset Password 🔐</h2>
                <p className="auth-subtitle">Enter your email to receive a one-time passcode</p>
                <form onSubmit={handleSendOtp} className="auth-form">
                  <div className="input-group">
                    <label>Email address</label>
                    <input
                      type="email"
                      name="forgotEmail"
                      placeholder="you@example.com"
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <button type="submit" className="auth-submit-btn secondary" disabled={loading}>
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                </form>
                <div className="divider"><span>Then enter your OTP below</span></div>
                <form onSubmit={handleVerifyOtp} className="auth-form">
                  <div className="input-group">
                    <label>One-time password</label>
                    <input type="text" name="otp" placeholder="Enter OTP" onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label>New password</label>
                    <input type="password" name="newPassword" placeholder="Min. 6 characters" onChange={handleChange} required />
                  </div>
                  <button type="submit" className="auth-submit-btn" disabled={loading}>
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>
              </div>
            )}

            {message && (
              <div className={`auth-message ${status}`}>
                {status === "success" && <FaCheckCircle />}
                {message}
              </div>
            )}
          </div>

          <p className="auth-footer">
            <FaLock className="footer-lock" />
            Your messages are end-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
};
