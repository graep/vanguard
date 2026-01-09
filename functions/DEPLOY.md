# Deploy the Email Function

To fix the CORS error and enable email sending, deploy the function:

```powershell
cd functions
npm run build
firebase deploy --only functions:sendVanReportEmail
```

## If you haven't set environment variables yet:

1. **Set them first** (see SETUP_INSTRUCTIONS.md or run `.\set-email-vars.ps1`)
2. **Then deploy** the function

## After deployment:

The CORS error should be resolved and the function will be accessible from:
- http://localhost:54954 (your current dev server)
- http://localhost:4200 (Angular default)
- http://localhost:8100 (Ionic default)
- Your production Firebase hosting URLs

## Verify deployment:

Check that the function is deployed:
```powershell
firebase functions:list
```

You should see `sendVanReportEmail` in the list.
