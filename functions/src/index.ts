/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as nodemailer from "nodemailer";

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
setGlobalOptions({ maxInstances: 10 });

// Email configuration will be read from environment variables
// Set these via Firebase Console: Functions → Configuration → Environment variables

/**
 * Send van report email via Firebase Functions
 * 
 * Configuration:
 * Set these environment variables in Firebase:
 * - EMAIL_SERVICE (e.g., "gmail", "sendgrid", or SMTP host)
 * - EMAIL_USER (your email address)
 * - EMAIL_PASSWORD (your email password or app password)
 * - EMAIL_FROM (sender email, defaults to EMAIL_USER)
 * 
 * For Gmail:
 * 1. Enable 2-factor authentication
 * 2. Generate an App Password: https://myaccount.google.com/apppasswords
 * 3. Use the app password as EMAIL_PASSWORD
 */
export const sendVanReportEmail = onCall(
  {
    cors: [
      "http://localhost:54954",
      "http://localhost:4200",
      "http://localhost:8100",
      /^https:\/\/.*\.web\.app$/,
      /^https:\/\/.*\.firebaseapp\.com$/,
    ],
    maxInstances: 10,
    region: "us-central1",
  },
  async (request) => {
  const {to, subject, reportUrl, vanInfo} = request.data;

  // Validate input
  if (!to || !subject || !reportUrl) {
    throw new Error("Missing required fields: to, subject, or reportUrl");
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new Error("Invalid email address");
  }

  logger.info("Email request received", {
    to,
    subject,
    vanInfo
  });

  // Get email configuration from environment variables
  // These should be set in Firebase Console: Functions → Configuration → Environment variables
  const service = process.env.EMAIL_SERVICE || "gmail";
  const user = process.env.EMAIL_USER || "";
  const password = process.env.EMAIL_PASSWORD || "";
  const from = process.env.EMAIL_FROM || user;

  // Check if email is configured
  if (!user || !password) {
    const errorMsg = "Email service is not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables in Firebase Console.";
    logger.error(errorMsg, {
      hasUser: !!user,
      hasPassword: !!password
    });
    throw new Error(errorMsg);
  }

  try {
    // Create transporter based on service type
    let transporter: nodemailer.Transporter;

    if (service === "gmail" || service === "smtp") {
      // Gmail or generic SMTP
      transporter = nodemailer.createTransport({
        service: service === "gmail" ? "gmail" : undefined,
        host: service !== "gmail" ? service : undefined,
        port: service !== "gmail" ? 587 : undefined,
        secure: service !== "gmail" ? false : undefined,
        auth: {
          user: user,
          pass: password,
        },
      });
    } else {
      // For SendGrid or other services, use SMTP
      transporter = nodemailer.createTransport({
        host: `smtp.${service}.com`,
        port: 587,
        secure: false,
        auth: {
          user: user,
          pass: password,
        },
      });
    }

    // Email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 20px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #3b82f6;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Van Inspection Report</h2>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Please review the van inspection report for <strong>${vanInfo}</strong>.</p>
              <p>Click the button below to view the complete report with all photos and inspection details:</p>
              <a href="${reportUrl}" class="button">View Full Report</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3b82f6;">${reportUrl}</p>
              <div class="footer">
                <p>This email was sent from the Vanguard Fleet Inspection System.</p>
                <p>If you did not expect this email, please ignore it.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Van Inspection Report

Please review the van inspection report for ${vanInfo}.

View the full report here: ${reportUrl}

This link will open the complete report with all photos and inspection details.

This email was sent from the Vanguard Fleet Inspection System.
    `;

    // Send email
    const mailOptions = {
      from: from,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent,
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info("Email sent successfully", {
      messageId: info.messageId,
      to: to
    });

    return {
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId
    };
  } catch (error: any) {
    logger.error("Failed to send email", {
      error: error.message,
      to: to
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
});
