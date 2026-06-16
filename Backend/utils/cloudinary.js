const cloudinary = require('cloudinary').v2;

/**
 * Extracts public_id from a Cloudinary URL
 * Example URL: https://res.cloudinary.com/dxw2yevce/image/upload/v1718223344/user_images/my-image.png
 * Returns: user_images/my-image
 */
const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;
  
  try {
    // Split by '/' and get the parts after '/upload/'
    const parts = url.split('/upload/');
    if (parts.length !== 2) return null;
    
    const filePart = parts[1];
    // Remove version (e.g. v1718223344/) if present
    const withoutVersion = filePart.replace(/^v\d+\//, '');
    
    // Remove file extension
    const publicId = withoutVersion.includes('.') 
      ? withoutVersion.substring(0, withoutVersion.lastIndexOf('.'))
      : withoutVersion;
    return publicId;
  } catch (err) {
    console.error("Error parsing Cloudinary URL:", err);
    return null;
  }
};

/**
 * Deletes an image from Cloudinary
 * @param {string} url - The full Cloudinary image URL
 */
const deleteFromCloudinary = async (url) => {
  // If no credentials, just fail silently to avoid crashing dev environments
  if (!process.env.CLOUDINARY_URL) {
    console.warn("⚠️ CLOUDINARY_URL not set. Skipping image deletion.");
    return;
  }
  
  const publicId = getPublicIdFromUrl(url);
  if (!publicId) return;

  try {
    const isVideo = url.includes('.mp4') || url.includes('.webm');
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: isVideo ? 'video' : 'image'
    });
    console.log(`Cloudinary deletion [${publicId}]:`, result.result);
  } catch (err) {
    console.error("❌ Failed to delete from Cloudinary:", err);
  }
};

module.exports = {
  deleteFromCloudinary,
  getPublicIdFromUrl
};
