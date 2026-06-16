import { useState } from "react";
import axios from "axios";
import { FaSun, FaMoon, FaLock, FaTrash, FaShieldAlt, FaBell, FaSignOutAlt, FaCheck } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");

export const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 6) return showMsg("New password must be at least 6 characters.", "error");
    if (pwForm.newPassword !== pwForm.confirmPassword) return showMsg("Passwords do not match.", "error");
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/change-password`, {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      }, { withCredentials: true });
      showMsg("Password updated successfully!");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      showMsg(err.response?.data?.message || "Failed to change password.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return showMsg("Type DELETE to confirm.", "error");
    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/delete-account`, { withCredentials: true });
      localStorage.clear();
      window.location.href = "/";
    } catch (err) {
      showMsg(err.response?.data?.message || "Failed to delete account.", "error");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${BASE_URL}/logout-all`, {}, { withCredentials: true });
      localStorage.clear();
      window.location.href = "/";
    } catch {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <div className="settings-page animate-in">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      {msg.text && (
        <div className={`settings-toast ${msg.type}`}>
          {msg.type === "success" && <FaCheck />}
          {msg.text}
        </div>
      )}

      {/* ── Appearance ── */}
      <div className="settings-section glass-card">
        <div className="section-header">
          <span className="section-icon"><FaSun /></span>
          <div>
            <h2>Appearance</h2>
            <p>Customize how Connectify looks</p>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>Theme</strong>
            <span>Switch between dark and light mode</span>
          </div>
          <button className={`theme-toggle-btn ${theme}`} onClick={toggleTheme}>
            {theme === "dark" ? (
              <><FaSun /> Light Mode</>
            ) : (
              <><FaMoon /> Dark Mode</>
            )}
          </button>
        </div>
      </div>

      {/* ── Change Password ── */}
      <div className="settings-section glass-card">
        <div className="section-header">
          <span className="section-icon"><FaLock /></span>
          <div>
            <h2>Change Password</h2>
            <p>Update your account password</p>
          </div>
        </div>
        <form className="settings-form" onSubmit={handleChangePassword}>
          <div className="settings-input-group">
            <label>Current Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={pwForm.currentPassword}
              onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
              required
            />
          </div>
          <div className="settings-input-group">
            <label>New Password</label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={pwForm.newPassword}
              onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
              required
            />
          </div>
          <div className="settings-input-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              placeholder="Repeat new password"
              value={pwForm.confirmPassword}
              onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Updating..." : <><FaLock /> Update Password</>}
          </button>
        </form>
      </div>

      {/* ── Privacy ── */}
      <div className="settings-section glass-card">
        <div className="section-header">
          <span className="section-icon"><FaShieldAlt /></span>
          <div>
            <h2>Privacy & Security</h2>
            <p>Control your data and security</p>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>End-to-end encryption</strong>
            <span>All your messages are encrypted with AES-256</span>
          </div>
          <span className="status-chip green">Active</span>
        </div>
        <div className="settings-row">
          <div>
            <strong>Session management</strong>
            <span>Sign out of all devices</span>
          </div>
          <button className="btn-secondary small" onClick={handleLogout}>
            <FaSignOutAlt /> Sign out all
          </button>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="settings-section glass-card danger-zone">
        <div className="section-header">
          <span className="section-icon danger"><FaTrash /></span>
          <div>
            <h2>Danger Zone</h2>
            <p>Irreversible actions — proceed with caution</p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <div className="settings-row">
            <div>
              <strong>Delete Account</strong>
              <span>Permanently delete your account and all data</span>
            </div>
            <button className="btn-danger small" onClick={() => setShowDeleteConfirm(true)}>
              <FaTrash /> Delete Account
            </button>
          </div>
        ) : (
          <div className="delete-confirm-box">
            <p>⚠️ This action is <strong>irreversible</strong>. All your messages, posts, and friends will be permanently deleted.</p>
            <p>Type <strong>DELETE</strong> to confirm:</p>
            <input
              type="text"
              placeholder="Type DELETE"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
            />
            <div className="delete-confirm-actions">
              <button className="btn-secondary" onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "DELETE" || loading}
              >
                {loading ? "Deleting..." : <><FaTrash /> Permanently Delete</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
