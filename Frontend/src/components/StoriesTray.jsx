import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaPlus, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { compressImage } from '../utils/imageCompression';
import './StoriesTray.css';

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

export const StoriesTray = () => {
  const [groupedStories, setGroupedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Viewer State
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/stories`, { withCredentials: true });
      setGroupedStories(res.data);
    } catch (err) {
      console.error("Failed to fetch stories", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadStory = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Compress Image
      const compressedImage = await compressImage(file, 1080, 1920, 0.8);
      
      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", compressedImage);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const cloudRes = await axios.post("https://api.cloudinary.com/v1_1/dwzvlijky/image/upload", formData);
      const imageUrl = cloudRes.data.secure_url;

      // 3. Save to backend
      await axios.post(`${BASE_URL}/story`, { image: imageUrl }, { withCredentials: true });
      
      // Refresh stories
      fetchStories();
    } catch (err) {
      console.error("Story upload failed", err);
      alert("Failed to upload story");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const openViewer = (groupIndex) => {
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(0);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setActiveGroupIndex(null);
    setActiveStoryIndex(0);
  };

  const nextStory = () => {
    if (activeGroupIndex === null) return;
    const currentGroup = groupedStories[activeGroupIndex];
    if (activeStoryIndex < currentGroup.stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else if (activeGroupIndex < groupedStories.length - 1) {
      setActiveGroupIndex(prev => prev + 1);
      setActiveStoryIndex(0);
    } else {
      closeViewer();
    }
  };

  const prevStory = () => {
    if (activeGroupIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
    } else if (activeGroupIndex > 0) {
      setActiveGroupIndex(prev => prev - 1);
      setActiveStoryIndex(groupedStories[activeGroupIndex - 1].stories.length - 1);
    }
  };

  // Auto-advance
  useEffect(() => {
    if (!viewerOpen) return;
    const timer = setTimeout(() => {
      nextStory();
    }, 5000); // 5 seconds per story
    return () => clearTimeout(timer);
  }, [viewerOpen, activeGroupIndex, activeStoryIndex]);

  return (
    <div className="stories-tray-container">
      <div className="stories-tray">
        {/* Add Story Button */}
        <div className="story-item add-story" onClick={() => fileInputRef.current?.click()}>
          <div className="story-ring empty">
            {uploading ? (
              <div className="uploading-spinner"></div>
            ) : (
              <div className="add-icon"><FaPlus /></div>
            )}
          </div>
          <span className="story-username">Add Story</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUploadStory} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>

        {/* Stories */}
        {!loading && groupedStories.map((group, index) => (
          <div className="story-item" key={group.user._id} onClick={() => openViewer(index)}>
            <div className="story-ring active">
              <img 
                src={group.user.image && !group.user.image.includes('undefined') ? group.user.image : `${BASE_URL}/default-photo.png`} 
                alt={group.user.username} 
                onError={(e) => e.target.src = `${BASE_URL}/default-photo.png`}
              />
            </div>
            <span className="story-username">{group.user.username}</span>
          </div>
        ))}
      </div>

      {/* Fullscreen Viewer */}
      {viewerOpen && activeGroupIndex !== null && (
        <div className="story-viewer-overlay">
          <div className="story-viewer-content">
            <div className="story-progress-bar">
              {groupedStories[activeGroupIndex].stories.map((_, idx) => (
                <div key={idx} className="progress-segment">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: idx < activeStoryIndex ? '100%' : idx === activeStoryIndex ? '100%' : '0%',
                      transition: idx === activeStoryIndex ? 'width 5s linear' : 'none'
                    }}
                  ></div>
                </div>
              ))}
            </div>

            <div className="story-viewer-header">
              <div className="story-user-info">
                <img 
                  src={groupedStories[activeGroupIndex].user.image && !groupedStories[activeGroupIndex].user.image.includes('undefined') ? groupedStories[activeGroupIndex].user.image : `${BASE_URL}/default-photo.png`} 
                  alt="user" 
                  onError={(e) => e.target.src = `${BASE_URL}/default-photo.png`}
                />
                <span>{groupedStories[activeGroupIndex].user.username}</span>
              </div>
              <button className="close-viewer-btn" onClick={closeViewer}><FaTimes /></button>
            </div>

            <div className="story-image-container" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              if (x < rect.width / 2) prevStory();
              else nextStory();
            }}>
              <img 
                src={groupedStories[activeGroupIndex].stories[activeStoryIndex].image} 
                alt="Story" 
                className="story-image"
              />
            </div>
            
            <button className="nav-btn prev-btn" onClick={(e) => { e.stopPropagation(); prevStory(); }}><FaChevronLeft /></button>
            <button className="nav-btn next-btn" onClick={(e) => { e.stopPropagation(); nextStory(); }}><FaChevronRight /></button>
          </div>
        </div>
      )}
    </div>
  );
};
