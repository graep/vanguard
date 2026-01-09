# Set Email Environment Variables for Firebase Functions
# Edit the values below with your actual email credentials, then run this script

# ============================================
# EDIT THESE VALUES WITH YOUR EMAIL CREDENTIALS
# ============================================

$EMAIL_SERVICE = "gmail"  # Options: "gmail", "sendgrid", or "smtp"
$EMAIL_USER = "your-email@gmail.com"  # Your email address
$EMAIL_PASSWORD = "your-app-password"  # For Gmail: Get App Password from https://myaccount.google.com/apppasswords
$EMAIL_FROM = "your-email@gmail.com"  # Sender email (usually same as EMAIL_USER)

# ============================================
# DO NOT EDIT BELOW THIS LINE
# ============================================

Write-Host "`n🔐 Setting Firebase environment variables...`n" -ForegroundColor Cyan

try {
    Write-Host "Setting EMAIL_SERVICE = $EMAIL_SERVICE..." -ForegroundColor Green
    firebase functions:config:set email.service="$EMAIL_SERVICE"
    
    Write-Host "Setting EMAIL_USER = $EMAIL_USER..." -ForegroundColor Green
    firebase functions:config:set email.user="$EMAIL_USER"
    
    Write-Host "Setting EMAIL_PASSWORD..." -ForegroundColor Green
    firebase functions:config:set email.password="$EMAIL_PASSWORD"
    
    Write-Host "Setting EMAIL_FROM = $EMAIL_FROM..." -ForegroundColor Green
    firebase functions:config:set email.from="$EMAIL_FROM"
    
    Write-Host "`n✅ Environment variables set successfully!`n" -ForegroundColor Green
    Write-Host "📦 Next step: Deploy the function" -ForegroundColor Cyan
    Write-Host "   Run: firebase deploy --only functions:sendVanReportEmail`n" -ForegroundColor Yellow
    
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    Write-Host "`nMake sure you:" -ForegroundColor Yellow
    Write-Host "  1. Are logged into Firebase: firebase login" -ForegroundColor Yellow
    Write-Host "  2. Have the correct project selected: firebase use vanguard-f8b90" -ForegroundColor Yellow
    exit 1
}
