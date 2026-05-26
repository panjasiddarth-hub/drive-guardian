import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

let transporter = null; // ✅ Reuse transporter (performance optimization)

export const sendEmail = async (to, subject, text, html) => {
    try {
        const EMAIL_USER = process.env.EMAIL_USER;
        const EMAIL_PASS = process.env.EMAIL_PASS;

        if (!EMAIL_USER || !EMAIL_PASS) {
            console.error("❌ EMAIL_USER or EMAIL_PASS missing in .env");
            return false;
        }

        if (!to) {
            console.error("❌ No recipient email provided");
            return false;
        }

        console.log("📤 Attempting email send...");
        console.log("To:", to);

        // ✅ Create transporter only once
        if (!transporter) {
            transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 587,
                secure: false,
                auth: {
                    user: EMAIL_USER,
                    pass: EMAIL_PASS,
                },
                tls: {
                    rejectUnauthorized: false,
                },
                connectionTimeout: 10000, // 10 sec timeout
            });

            // ✅ Verify connection once
            try {
                await transporter.verify();
                console.log("✅ SMTP server ready");
            } catch (verifyErr) {
                console.error("❌ SMTP verification failed:", verifyErr.message);
                return false;
            }
        }

        const info = await transporter.sendMail({
            from: `"Fleet Intelligence" <${EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });

        console.log("✅ Email sent:", info.response);
        return true;

    } catch (err) {
        console.error("❌ EMAIL FAILED:", err.message);
        return false;
    }
};