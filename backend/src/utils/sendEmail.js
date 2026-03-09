import axios from "axios";

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await axios.post(process.env.EMAIL_SERVICE_URL, {
      to,
      subject,
      html,
    });
    console.log("Email sent successfully:", response.data);
    return response.data;
  } catch (err) {
    console.error("Email failed:", err.response?.data || err.message);
    throw err;
  }
};
