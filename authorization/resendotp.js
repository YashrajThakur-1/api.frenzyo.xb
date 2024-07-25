const nodemailer = require("nodemailer");

const sendVerificationCode = async (email, code) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "yash.dicecoder105@gmail.com",
        pass: "nfyveyqifyapvshl",
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: "yash.dicecoder105@gmail.com", // Use your environment variable here
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
