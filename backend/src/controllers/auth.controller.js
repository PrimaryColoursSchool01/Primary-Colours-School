import { validateEmail } from "../utils/auth.js";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const err = new Error("Email and password are required");
    err.statusCode = 400;
    return next(err);
  }

  if (!validateEmail(email)) {
    const err = new Error("Invalid email format");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      const err = new Error("Invalid credentials");
      err.statusCode = 401;
      return next(err);
    }

    if (user.status === "suspended") {
      const err = new Error("Account is suspended. Contact administrator.");
      err.statusCode = 403;
      return next(err);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const err = new Error("Invalid credentials");
      err.statusCode = 401;
      return next(err);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const isProd = process.env.NODE_ENV === "production";

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    const err = new Error("Email is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!validateEmail(email)) {
    const err = new Error("Invalid email format");
    err.statusCode = 400;
    return next(err);
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        message: "If an account exists with that email, you will receive a link to reset your password.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = tokenExpiry;
    await user.save();

    const resetLink = `${process.env.APP_URL}/reset-password?token=${rawToken}&email=${normalizedEmail}`;
    await sendEmail({
      to: normalizedEmail,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link to reset your password: <a href="${resetLink}">Reset Password</a></p>`,
    });
    console.log(`Password reset email sent to ${normalizedEmail} with link: ${resetLink}`);

    return res.json({
      message: "If an account exists with this email, you will receive a link to reset your password.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    const err = new Error("Token and new password are required");
    err.statusCode = 400;
    return next(err);
  }

  if (newPassword.length < 6) {
    const err = new Error("New password must be at least 6 characters long");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      const err = new Error("Invalid or expired token");
      err.statusCode = 400;
      return next(err);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    user.tokenVersion += 1;

    await user.save();

    return res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    const err = new Error("Current password and new password are required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      const err = new Error("Current password is incorrect");
      err.statusCode = 401;
      return next(err);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change Password Error:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

// todo:test this on a api client like postman or insomnia
export const refreshToken = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    const err = new Error("Refresh token is missing");
    err.statusCode = 401;
    return next(err);
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      const err = new Error("Invalid refresh token");
      err.statusCode = 401;
      return next(err);
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      const err = new Error("Token has been revoked");
      err.statusCode = 401;
      return next(err);
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      accessToken: newAccessToken,
      message: "Token refreshed successfully",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error("Refresh Token Error:", error);
    if (!error.statusCode) error.statusCode = 401;
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    const err = new Error("Refresh token is missing");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};
