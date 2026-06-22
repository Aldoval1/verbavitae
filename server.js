// Remove nodemailer, using EmailJS REST API instead
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files (HTML, CSS, JS, Images)
app.use(express.static(path.join(__dirname, '')));


// Helper function to generate professional HTML email template
const generateEmailTemplate = () => {
    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7fafc; padding: 20px; border-radius: 8px;">
        <div style="background-color: #0d1b2a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Verba Vitae</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1a202c; font-size: 20px; margin-top: 0;">You're Invited!</h2>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                You have been officially invited to join the <strong>Verba Vitae</strong> community.
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                We are a community dedicated to academic excellence, collaboration, and shared knowledge. By joining us, you'll get access to exclusive study groups, our shared catalog of books and resources, and community events.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://theverbavitae.org/join.html" style="background-color: #3182ce; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Join Verba Vitae</a>
            </div>
            <p style="color: #718096; font-size: 14px; margin-bottom: 0;">
                If you have any questions, feel free to reply to this email or contact the E-Board.
            </p>
        </div>
        <div style="text-align: center; padding-top: 20px;">
            <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Verba Vitae. All rights reserved.</p>
        </div>
    </div>
    `;
};

// API Endpoint to handle invitations
app.post('/api/send-invites', async (req, res) => {
    try {
        const { emails } = req.body;

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid emails provided.' });
        }

        if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
            console.error('Server EmailJS credentials are not configured.');
            return res.status(500).json({ success: false, message: 'Server is not configured to send emails. (Missing Env Vars)' });
        }

        console.log(`Attempting to send ${emails.length} emails via EmailJS API...`);

        const htmlDesign = generateEmailTemplate();

        const emailPromises = emails.map(async (email) => {
            const payload = {
                service_id: process.env.EMAILJS_SERVICE_ID,
                template_id: process.env.EMAILJS_TEMPLATE_ID,
                user_id: process.env.EMAILJS_PUBLIC_KEY,
                accessToken: process.env.EMAILJS_PRIVATE_KEY || "", // Optional but recommended
                template_params: {
                    to_email: email,
                    html_message: htmlDesign
                }
            };

            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`EmailJS API Error: ${response.status} ${text}`);
            }
        });

        await Promise.all(emailPromises);
        console.log('Emails successfully sent via EmailJS API.');

        res.status(200).json({ success: true, message: `Successfully sent ${emails.length} invitations!` });
    } catch (error) {
        console.error('Error sending emails:', error);
        res.status(500).json({ success: false, message: 'Failed to send invitations. Check server logs.' });
    }
});

// Fallback to index.html for unknown routes (useful for SPA behavior if needed)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
