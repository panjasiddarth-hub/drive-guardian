import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

export const sendEmail = async (to, subject, text, html) => {
    try {
        const EMAIL_USER = process.env.EMAIL_USER;
        const EMAIL_PASS = process.env.EMAIL_PASS;

        if (!EMAIL_USER || !EMAIL_PASS) {
            console.error("❌ EMAIL_USER or EMAIL_PASS missing in .env");
            return false;
        }

        console.log("📤 Attempting email send...");
        console.log("To:", to);

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"Fleet Intelligence" <${EMAIL_USER}>`,
            to,
            subject,
            text,
            html, // ✅ now supports html
        });

        console.log("✅ Email sent:", info.response);
        return true;

    } catch (err) {
        console.error("❌ EMAIL FAILED:", err);
        return false;
    }
};