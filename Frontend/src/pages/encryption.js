import CryptoJS from "crypto-js";

// Keep this secret key safe and the same across sender & receiver
const SECRET_KEY = import.meta.env.VITE_SECRET_KEY || "connectify-key";

export function encryptText(message) {
  if (message.startsWith("data:image")) return message;
  return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
}

export function decryptText(message) {
  if (message.startsWith("data:image")) return message;
  try {
    const bytes = CryptoJS.AES.decrypt(message, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.error("Decryption failed:", err);
    return message;
  }
}
