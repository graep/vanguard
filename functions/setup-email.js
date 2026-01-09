#!/usr/bin/env node

/**
 * Email Setup Script for Firebase Functions
 * 
 * This script helps you set up email environment variables for the van report sharing feature.
 * 
 * Usage:
 *   node setup-email.js
 * 
 * Or run the commands manually:
 *   firebase functions:secrets:set EMAIL_USER
 *   firebase functions:secrets:set EMAIL_PASSWORD
 *   firebase functions:secrets:set EMAIL_SERVICE
 *   firebase functions:secrets:set EMAIL_FROM
 */

const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEmail() {
  console.log('\n📧 Email Configuration Setup for Van Report Sharing\n');
  console.log('This will set up environment variables for sending emails.\n');

  try {
    // Get email service
    const service = await question('Email service (gmail/sendgrid/smtp) [gmail]: ') || 'gmail';
    
    // Get email user
    const user = await question('Email address (e.g., your-email@gmail.com): ');
    if (!user) {
      console.error('❌ Email address is required');
      process.exit(1);
    }

    // Get email password/app password
    console.log('\n⚠️  For Gmail: You need an App Password (not your regular password)');
    console.log('   Get one at: https://myaccount.google.com/apppasswords\n');
    const password = await question('Email password or App Password: ');
    if (!password) {
      console.error('❌ Password is required');
      process.exit(1);
    }

    // Get from email (optional)
    const from = await question(`From email address [${user}]: `) || user;

    console.log('\n🔐 Setting up Firebase Secrets (for sensitive data)...\n');

    // Set secrets for sensitive data
    try {
      execSync(`firebase functions:secrets:set EMAIL_USER --data-file <(echo -n "${user}")`, { 
        shell: '/bin/bash',
        stdio: 'inherit'
      });
    } catch (e) {
      // Fallback for Windows
      const fs = require('fs');
      const tmpFile = require('os').tmpdir() + '/email_user.txt';
      fs.writeFileSync(tmpFile, user);
      execSync(`firebase functions:secrets:set EMAIL_USER --data-file "${tmpFile}"`, { stdio: 'inherit' });
      fs.unlinkSync(tmpFile);
    }

    try {
      execSync(`firebase functions:secrets:set EMAIL_PASSWORD --data-file <(echo -n "${password}")`, { 
        shell: '/bin/bash',
        stdio: 'inherit'
      });
    } catch (e) {
      // Fallback for Windows
      const fs = require('fs');
      const tmpFile = require('os').tmpdir() + '/email_pass.txt';
      fs.writeFileSync(tmpFile, password);
      execSync(`firebase functions:secrets:set EMAIL_PASSWORD --data-file "${tmpFile}"`, { stdio: 'inherit' });
      fs.unlinkSync(tmpFile);
    }

    console.log('\n📝 Setting environment variables...\n');

    // Set environment variables (non-sensitive)
    execSync(`firebase functions:config:set email.service="${service}"`, { stdio: 'inherit' });
    if (from !== user) {
      execSync(`firebase functions:config:set email.from="${from}"`, { stdio: 'inherit' });
    }

    console.log('\n✅ Email configuration set successfully!');
    console.log('\n📦 Next steps:');
    console.log('   1. Deploy the function: firebase deploy --only functions:sendVanReportEmail');
    console.log('   2. Test by sharing a van report from the app\n');

  } catch (error) {
    console.error('\n❌ Error setting up email configuration:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setupEmail();
