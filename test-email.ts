import "dotenv/config";
import nodemailer from "nodemailer";

async function testEmail() {
    console.log("Testing email configuration...");
    console.log("GMAIL_USER:", process.env.GMAIL_USER);
    console.log("GMAIL_APP_PASSWORD:", process.env.GMAIL_APP_PASSWORD ? "****" : "MISSING");

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error("Missing credentials in .env file");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    try {
        console.log("Verifying connection...");
        await transporter.verify();
        console.log("Connection successful!");

        console.log("Sending test email...");
        const info = await transporter.sendMail({
            from: `"Test" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER, // Send to self
            subject: "Test Email from Local Server",
            text: "If you receive this, the email configuration is working correctly.",
        });

        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        console.error("Error occurred:", error);
    }
}

testEmail();
