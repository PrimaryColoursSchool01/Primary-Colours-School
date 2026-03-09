import bcrypt from "bcrypt";
import Role from "../models/role.model.js";
import User from "../models/user.model.js";

export const seedAdmin = async () => {
  try {
    //  Ensure Admin role exists
    let adminRole = await Role.findOne({ name: "Admin" });

    if (!adminRole) {
      adminRole = await Role.create({
        name: "Admin",
      });
      console.log("Admin role created");
    }

    //  Ensure admin user exists
    const existingAdmin = await User.findOne({
      email: "admin@school.com",
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await User.create({
        name: "System Admin",
        email: "admin@school.com",
        password: hashedPassword,
        role: adminRole._id,
        fullName: "System Admin",
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
