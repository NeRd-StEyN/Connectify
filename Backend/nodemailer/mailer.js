// nodemailer/mailer.js
const nodemailer = require("nodemailer");

const sendOtpEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // or your chosen email service
    auth: {
      user: process.env.EMAIL, // Your email address
      pass: process.env.EMAIL_PASSWORD, // Your email password or an app password
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Your OTP for Password Reset",
    text: `Your OTP is: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP email sent successfully!");
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email.");
  }
};

module.exports = sendOtpEmail;
