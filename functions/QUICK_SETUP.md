# Quick Email Setup - Fix 500 Error

The function is deployed but needs email credentials. Here's how to set them:

## Option 1: Firebase Console (Easiest)

1. Go to: https://console.firebase.google.com/project/vanguard-f8b90/functions/config
2. Click **"Environment variables"** tab
3. Click **"Add variable"** and add these 4 variables:

   ```
   EMAIL_SERVICE = gmail
   EMAIL_USER = your-email@gmail.com
   EMAIL_PASSWORD = your-16-char-app-password
   EMAIL_FROM = your-email@gmail.com
   ```

4. Click **Save**
5. The function will automatically restart with new config

## Option 2: Firebase CLI

Run these commands (replace with your values):

```powershell
firebase functions:config:set email.service="gmail"
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-password"
firebase functions:config:set email.from="your-email@gmail.com"
```

**Note:** For Firebase Functions v2, you may need to set them as environment variables in the Console instead.

## For Gmail Users

1. Enable 2-Factor Authentication: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Vanguard Fleet"
   - Copy the 16-character password
3. Use that App Password (NOT your regular password) as `EMAIL_PASSWORD`

## Verify

After setting variables, test again. The 500 error should be resolved and emails will send successfully.
