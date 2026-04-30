import bcrypt from "bcrypt";
import User from "../models/user.model.js";

export const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn("ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required for seeding admin user");
      return;
    }

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await User.create({
        fullName: "System Admin",
        email: adminEmail,
        password: hashedPassword,
        userType: "admin",
      });

      console.log("Admin user created");
      console.log(`Login → ${adminEmail} / ${adminPassword}`);
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Admin seeding error:", error);
  }
};
