const nodemailer = require("nodemailer");
require("dotenv").config();
const sendVerificationCode = async (email, code) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL, // Use your environment variable here
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is ${code}`,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send verification code email");
  }
};

module.exports = sendVerificationCode;
