@echo off
echo Starting Firebase deployment...
echo.

echo Step 1: Logging into Firebase...
firebase login

echo.
echo Step 2: Setting active project...
firebase use --add

echo.
echo Step 3: Deploying to hosting...
firebase deploy --only hosting

echo.
echo Deployment complete! Check the URL provided above.
pause
