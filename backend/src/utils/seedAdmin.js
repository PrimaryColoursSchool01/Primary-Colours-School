import bcrypt from "bcrypt";
import User from "../models/user.model.js";

export const seedAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: "admin@school.com" });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await User.create({
        fullName: "System Admin",
        email: "admin@school.com",
        password: hashedPassword,
        userType: "admin",
      });

      console.log("Admin user created");
      console.log("Login → admin@school.com / admin123");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Admin seeding error:", error);
  }
};
