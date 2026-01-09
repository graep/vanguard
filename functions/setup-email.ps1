# Email Setup Script for Firebase Functions (PowerShell)
# This script helps you set up email environment variables

Write-Host "`n📧 Email Configuration Setup for Van Report Sharing`n" -ForegroundColor Cyan
Write-Host "This will set up environment variables for sending emails.`n" -ForegroundColor Yellow

# Get email service
$service = Read-Host "Email service (gmail/sendgrid/smtp) [gmail]"
if ([string]::IsNullOrWhiteSpace($service)) {
    $service = "gmail"
}

# Get email user
$user = Read-Host "Email address (e.g., your-email@gmail.com)"
if ([string]::IsNullOrWhiteSpace($user)) {
    Write-Host "❌ Email address is required" -ForegroundColor Red
    exit 1
}

# Get email password
Write-Host "`n⚠️  For Gmail: You need an App Password (not your regular password)" -ForegroundColor Yellow
Write-Host "   Get one at: https://myaccount.google.com/apppasswords`n" -ForegroundColor Yellow
$password = Read-Host "Email password or App Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

if ([string]::IsNullOrWhiteSpace($passwordPlain)) {
    Write-Host "❌ Password is required" -ForegroundColor Red
    exit 1
}

# Get from email
$from = Read-Host "From email address [$user]"
if ([string]::IsNullOrWhiteSpace($from)) {
    $from = $user
}

Write-Host "`n🔐 Setting up Firebase environment variables...`n" -ForegroundColor Cyan

try {
    # Set environment variables using Firebase CLI
    # Note: For Firebase Functions v2, we use the params package which reads from environment
    # These will be set as environment variables that the function can access
    
    Write-Host "Setting EMAIL_SERVICE..." -ForegroundColor Green
    firebase functions:config:set email.service="$service"
    
    Write-Host "Setting EMAIL_USER..." -ForegroundColor Green
    firebase functions:config:set email.user="$user"
    
    Write-Host "Setting EMAIL_PASSWORD..." -ForegroundColor Green
    firebase functions:config:set email.password="$passwordPlain"
    
    if ($from -ne $user) {
        Write-Host "Setting EMAIL_FROM..." -ForegroundColor Green
        firebase functions:config:set email.from="$from"
    }
    
    Write-Host "`n✅ Email configuration set successfully!`n" -ForegroundColor Green
    Write-Host "📦 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Update the function code to read from functions.config()" -ForegroundColor Yellow
    Write-Host "   2. Deploy the function: firebase deploy --only functions:sendVanReportEmail" -ForegroundColor Yellow
    Write-Host "   3. Test by sharing a van report from the app`n" -ForegroundColor Yellow
    
} catch {
    Write-Host "`n❌ Error setting up email configuration: $_" -ForegroundColor Red
    exit 1
}
