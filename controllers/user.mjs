import User from "../models/User.mjs";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

export const signup = async (req, res) => {
    try {
        const { name, email, password, mobile } = req.body;
        if (!name || !email || !password || !mobile) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = bcrypt.hashSync(password.toString(), 8);
        const newUser = new User({ name, email, password: hashedPassword, mobile });
        await newUser.save();
        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });
        res.status(201).json({ message: "User created successfully", token });
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export const login = async (req, res) => {
    try {
        const { email = '', password = '' } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });
        res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, newPassword = '', oldPassword = '' } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        let hashedNewPassword = user.password;
        if (newPassword && oldPassword) {
            const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
            if (!isOldPasswordValid) {
                return res.status(401).json({ message: "Invalid old password" });
            }
            hashedNewPassword = bcrypt.hashSync(newPassword.toString(), 8);
        }
        const updatedUser = await User.findByIdAndUpdate(userId, { name, password: hashedNewPassword }, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Error during user update:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export const sendForgotPasswordMail = async (req, res) => {
    try {
        const { email } = req.params;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        let digits = '0123456789';
        let OTP = '';
        let len = digits.length
        for (let i = 0; i < 4; i++) {
            OTP += digits[Math.floor(Math.random() * len)];
        }
        console.log(`Generated OTP for ${email}: ${OTP}`);
        const transporter = nodemailer.createTransport({
            host: process.env.MAILTRAP_SMTP_HOST,
            port: process.env.MAILTRAP_SMTP_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.MAILTRAP_SMTP_USER,
                pass: process.env.MAILTRAP_SMTP_PASS,
            },
        });
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Password Reset',
            text: `Your otp is ${OTP}. Use this to reset your password.`
        };
        transporter.sendMail(mailOptions, async (error) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).json({ message: "Internal server error" });
            }
            await User.findByIdAndUpdate(user._id, { lastGeneratedOTP: parseInt(OTP) }, { new: true });
            res.status(200).json({ message: "Password reset email sent" });
        });
    } catch (error) {
        console.error("Error during password reset email sending:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export const verifyOTP = async (req, res) => {
    try {
        const { email } = req.params;
        const { otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.lastGeneratedOTP != otp) {
            return res.status(401).json({ message: "Invalid OTP" });
        }
        res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
        console.error("Error during OTP verification:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getUsersFromContacts = async (req, res) => {
    try {
        const { contacts } = req.body;
        if (!contacts || !Array.isArray(contacts)) {
            return res.status(400).json({ message: "Contacts must be an array" });
        }
        const users = await User.find({ mobile: { $in: contacts } }, 'name mobile email');
        res.status(200).json({ status: true, users });
        
    } catch (error) {
        console.error("Error fetching users from contacts:", error);
        res.status(500).json({ message: "Internal server error" });
        
    }
}