# Quick Email Setup Instructions

## Option 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **vanguard-f8b90**
3. Go to **Functions** → **Configuration** → **Environment variables**
4. Click **Add variable** and add these:

   - `EMAIL_SERVICE` = `gmail` (or `sendgrid`, `smtp`)
   - `EMAIL_USER` = `your-email@gmail.com`
   - `EMAIL_PASSWORD` = `your-app-password` (for Gmail, get from https://myaccount.google.com/apppasswords)
   - `EMAIL_FROM` = `your-email@gmail.com` (optional, defaults to EMAIL_USER)

5. Click **Save**
6. Deploy the function: `firebase deploy --only functions:sendVanReportEmail`

## Option 2: Firebase CLI (Command Line)

Run these commands (replace with your actual values):

```powershell
# Set email service
firebase functions:config:set email.service="gmail"

# Set email user
firebase functions:config:set email.user="your-email@gmail.com"

# Set email password (use Gmail App Password)
firebase functions:config:set email.password="your-16-char-app-password"

# Set from email (optional)
firebase functions:config:set email.from="your-email@gmail.com"
```

Then deploy:
```powershell
cd functions
npm run build
firebase deploy --only functions:sendVanReportEmail
```

## Option 3: Interactive Script

Run the PowerShell script:
```powershell
cd functions
.\setup-email.ps1
```

## For Gmail Users

1. Enable 2-Factor Authentication: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Vanguard Fleet"
   - Copy the 16-character password
3. Use that App Password (not your regular password) as `EMAIL_PASSWORD`

## Testing

After setup:
1. Go to Van Report page in your app
2. Click "Share" → "Share via Email"
3. Enter a test email address
4. Check if email is received

## Troubleshooting

- Check function logs: `firebase functions:log`
- Verify variables are set: `firebase functions:config:get`
- Make sure function is deployed: `firebase deploy --only functions`
