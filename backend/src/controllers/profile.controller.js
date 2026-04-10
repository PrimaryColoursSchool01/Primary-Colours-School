import User from "../models/user.model.js";

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -refreshToken -tokenVersion -resetPasswordToken -resetPasswordExpires")
      .populate("roles", "name");

    res.json({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || null,
      userType: user.userType,
      roles: user.roles?.map((r) => r.name) || [],
      status: user.status,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  const { fullName, phone } = req.body;
  if (!fullName?.trim()) return next({ statusCode: 400, message: "Name is required" });

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { fullName: fullName.trim(), phone: phone?.trim() || null },
      { new: true, runValidators: true },
    ).select("-password -refreshToken");

    res.json({ message: "Updated", user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone } });
  } catch (error) {
    next(error);
  }
};

export const logoutAllSessions = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      tokenVersion: (req.user.tokenVersion || 0) + 1,
      refreshToken: null,
    });
    res.json({ message: "All other sessions logged out" });
  } catch (error) {
    next(error);
  }
};
