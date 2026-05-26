import { sendEmail } from './sendEmail.js';

const mediumAlertCooldowns = new Map();
const FIVE_MINUTES = 5 * 60 * 1000;

export const sendRiskAlertEmail = async (alert, userEmail) => {

    if (!alert || !userEmail) {
        console.log("⚠️ Email skipped: Missing alert or user email");
        return;
    }

    const vehicleKey = `${alert.vehicle || "unknown"}_${userEmail}`;
    const risk = alert.riskLevel?.toLowerCase() || 'high';
    const isMedium = risk === 'medium';
    const isHighOrCritical =
        risk === 'high' || alert.type?.toLowerCase() === 'critical';

    const now = Date.now();

    // ✅ Cooldown logic (only for medium alerts)
    if (isMedium && !isHighOrCritical) {
        const lastSent = mediumAlertCooldowns.get(vehicleKey);

        if (lastSent && now - lastSent < FIVE_MINUTES) {
            console.log("⏳ Medium alert skipped (cooldown active)");
            return;
        }

        mediumAlertCooldowns.set(vehicleKey, now);

        // ✅ Auto cleanup to prevent memory leak
        setTimeout(() => {
            mediumAlertCooldowns.delete(vehicleKey);
        }, FIVE_MINUTES);
    }

    const to = userEmail;

    const themeColor = isMedium ? '#d97706' : '#dc2626';
    const alertLabel = isMedium ? 'WATCH' : 'ALERT';
    const riskWarningText = isMedium
        ? "Something abnormal is started. Keep an eye on him."
        : "High priority risk detected. Immediate action required.";

    const subject = `[${alertLabel}] ${alert.vehicle || "Unknown Vehicle"} - ${alert.title || "Risk Alert"}`;

const text = `
${isMedium ? 'FLEET WATCH NOTICE' : 'HIGH PRIORITY FLEET ALERT'}
-----------------------------------------------------

Vehicle: ${alert.vehicle || "N/A"}
Driver: ${alert.driver || "N/A"}

Risk Level: ${risk.toUpperCase()}
Risk Score: ${alert.riskScore ?? 'N/A'}%

━━━━━━━━━━━━━━━━━━━━━━
AI Analysis:
${alert.message || "No details available"}
`;

const html = `
<div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 2px solid ${themeColor}; border-radius: 14px; background:#ffffff;">

    <div style="text-align:center; margin-bottom:20px;">
        <h2 style="color:${themeColor}; margin-bottom:5px;">
            ${isMedium ? '⚠️ Moderate Driving Risk Detected' : '🚨 Critical Driving Risk Detected'}
        </h2>
        <p style="font-size:14px; color:#555;">
            ${riskWarningText}
        </p>
    </div>

    <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

    <table style="width:100%; font-size:14px;">
        <tr>
            <td><strong>Vehicle</strong></td>
            <td style="text-align:right;">${alert.vehicle || "N/A"}</td>
        </tr>
        <tr>
            <td><strong>Driver</strong></td>
            <td style="text-align:right;">${alert.driver || "N/A"}</td>
        </tr>
        <tr>
            <td><strong>Risk Level</strong></td>
            <td style="text-align:right; color:${themeColor}; font-weight:bold;">
                ${risk.toUpperCase()}
            </td>
        </tr>
        <tr>
            <td><strong>Risk Score</strong></td>
            <td style="text-align:right; font-weight:bold;">
                ${alert.riskScore ?? 'N/A'}%
            </td>
        </tr>
    </table>

    <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

    <div style="background:#f8fafc; padding:15px; border-left:4px solid ${themeColor}; border-radius:8px;">
        <h3 style="margin-top:0; color:${themeColor};">AI Risk Explanation</h3>
        <pre style="white-space:pre-wrap; font-family:Arial; font-size:14px; margin:0;">
${alert.message || "No explanation available"}
        </pre>
    </div>

    <div style="text-align:center; margin-top:30px;">
        <a href="http://localhost:5000/UserInterface/risks/index.html"
           style="background:${themeColor}; color:white; padding:12px 28px; text-decoration:none; border-radius:8px; font-weight:bold;">
           View Full Dashboard
        </a>
    </div>

</div>
`;

    try {
        await sendEmail(to, subject, text, html);
        console.log(`[EMAIL ALERT] Sent to ${to}`);
    } catch (err) {
        console.error(`[EMAIL ALERT FAILED]`, err.message);
    }
};