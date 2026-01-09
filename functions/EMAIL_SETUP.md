# Email Setup Guide for Van Report Sharing

This guide explains how to configure email sending for the van report sharing feature.

## Prerequisites

- ✅ nodemailer is already installed
- ✅ Firebase Functions are set up
- ⚠️ Email service credentials needed

## Configuration Steps

### Option 1: Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate an App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Vanguard Fleet" as the name
   - Copy the generated 16-character password

3. **Set Environment Variables in Firebase**

   Using Firebase CLI:
   ```bash
   firebase functions:config:set email.service="gmail"
   firebase functions:config:set email.user="your-email@gmail.com"
   firebase functions:config:set email.password="your-16-char-app-password"
   firebase functions:config:set email.from="your-email@gmail.com"
   ```

   Or using Firebase Console:
   - Go to Firebase Console → Functions → Configuration
   - Add the following environment variables:
     - `EMAIL_SERVICE`: `gmail`
     - `EMAIL_USER`: Your Gmail address
     - `EMAIL_PASSWORD`: Your app password (16 characters)
     - `EMAIL_FROM`: Your Gmail address (optional, defaults to EMAIL_USER)

### Option 2: SendGrid (Recommended for Production)

1. **Create a SendGrid Account**
   - Sign up at: https://sendgrid.com
   - Verify your sender email address

2. **Create an API Key**
   - Go to Settings → API Keys
   - Create a new API key with "Mail Send" permissions
   - Copy the API key

3. **Set Environment Variables**
   ```bash
   firebase functions:config:set email.service="sendgrid"
   firebase functions:config:set email.user="apikey"
   firebase functions:config:set email.password="your-sendgrid-api-key"
   firebase functions:config:set email.from="verified-sender@yourdomain.com"
   ```

### Option 3: Custom SMTP Server

For other email providers (Outlook, Yahoo, custom SMTP):

```bash
firebase functions:config:set email.service="smtp.yourprovider.com"
firebase functions:config:set email.user="your-email@domain.com"
firebase functions:config:set email.password="your-password"
firebase functions:config:set email.from="your-email@domain.com"
```

## Deploy the Function

After setting environment variables, deploy the function:

```bash
cd functions
npm run build
firebase deploy --only functions:sendVanReportEmail
```

Or deploy all functions:

```bash
firebase deploy --only functions
```

## Testing

1. Go to the Van Report page in your app
2. Click the "Share" button
3. Select "Share via Email"
4. Enter a test email address
5. Check if the email is received

## Troubleshooting

### Email not sending

1. **Check Firebase Function logs:**
   ```bash
   firebase functions:log
   ```

2. **Verify environment variables are set:**
   ```bash
   firebase functions:config:get
   ```

3. **Common issues:**
   - Gmail: Make sure you're using an App Password, not your regular password
   - SendGrid: Verify your sender email is verified
   - SMTP: Check firewall/network settings allow outbound connections on port 587

### Function not found error

- Make sure the function is deployed: `firebase deploy --only functions`
- Check the function name matches: `sendVanReportEmail`

## Security Notes

- ⚠️ Never commit email passwords to version control
- ✅ Use environment variables for all sensitive credentials
- ✅ Use App Passwords for Gmail (not your main password)
- ✅ Rotate passwords regularly
- ✅ Use SendGrid or similar service for production (better deliverability)

## Email Template

The email includes:
- Professional HTML template with styling
- Van information (type and number)
- Direct link to the report
- Plain text fallback for email clients that don't support HTML

You can customize the email template in `functions/src/index.ts` in the `htmlContent` variable.
