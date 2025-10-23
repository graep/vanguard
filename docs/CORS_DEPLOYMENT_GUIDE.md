# CORS and Deployment Configuration Guide

## CORS Configuration

The `cors.json` file has been updated to support multiple environments:

### Development Origins
- `http://localhost:8100` - Ionic dev server
- `http://localhost:4200` - Angular dev server
- `http://127.0.0.1:8100` - Alternative localhost
- `http://127.0.0.1:4200` - Alternative localhost

### Production Origins
- `https://vanguard-fleet-inspection.web.app` - Firebase hosting
- `https://vanguard-fleet-inspection.firebaseapp.com` - Firebase hosting (legacy)
- `https://vanguard-fleet.com` - Custom domain
- `https://www.vanguard-fleet.com` - Custom domain with www

### Supported Methods
- GET, HEAD, PUT, POST, DELETE, OPTIONS

### Response Headers
- Content-Type
- Authorization
- X-Requested-With
- Accept
- Origin
- Access-Control-Request-Method
- Access-Control-Request-Headers

## Firebase Hosting Security Headers

The `firebase.json` has been enhanced with security headers:

### Security Headers
- **X-Content-Type-Options**: `nosniff` - Prevents MIME type sniffing
- **X-Frame-Options**: `DENY` - Prevents clickjacking attacks
- **X-XSS-Protection**: `1; mode=block` - Enables XSS filtering
- **Referrer-Policy**: `strict-origin-when-cross-origin` - Controls referrer information
- **Permissions-Policy**: `camera=(), microphone=(), geolocation=(self)` - Controls feature access

### Performance Headers
- **Cache-Control**: `max-age=31536000` for static assets (JS, CSS, images)
- Long-term caching for better performance

### URL Handling
- **Rewrites**: All routes redirect to `/index.html` for SPA routing
- **Redirects**: `/admin` redirects to `/admin/` for consistency

## Deployment Checklist

### Before Deploying to Production

1. **Update CORS Origins**
   - Replace placeholder domains with your actual production domains
   - Add any staging/testing domains you need
   - Remove any unused development origins

2. **Configure Custom Domain**
   - Set up your custom domain in Firebase Hosting
   - Update DNS records as instructed by Firebase
   - Add SSL certificate (automatically handled by Firebase)

3. **Environment Variables**
   - Set up Firebase environment variables for production
   - Configure Firebase App Check
   - Set up proper Firebase project settings

4. **Security Review**
   - Review Firebase Security Rules
   - Test authentication flows
   - Verify CORS is working correctly
   - Check that security headers are applied

### Testing CORS Configuration

1. **Local Testing**
   ```bash
   # Test with different ports
   ionic serve --port=8100
   ng serve --port=4200
   ```

2. **Production Testing**
   ```bash
   # Deploy to Firebase
   firebase deploy --only hosting
   
   # Test CORS with curl
   curl -H "Origin: https://your-domain.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS \
        https://your-firebase-project.web.app/api/endpoint
   ```

3. **Browser Testing**
   - Open browser dev tools
   - Check Network tab for CORS errors
   - Verify preflight requests are successful

## Common CORS Issues and Solutions

### Issue: CORS Error in Production
**Solution**: Add your production domain to `cors.json`

### Issue: Preflight Requests Failing
**Solution**: Ensure `OPTIONS` method is included in CORS configuration

### Issue: Custom Headers Blocked
**Solution**: Add custom headers to `responseHeader` array in `cors.json`

### Issue: Credentials Not Sent
**Solution**: Add `"credentials": true` to CORS configuration if needed

## Security Considerations

1. **Domain Validation**
   - Only add trusted domains to CORS origins
   - Use HTTPS for all production domains
   - Regularly review and remove unused origins

2. **Method Restrictions**
   - Only allow necessary HTTP methods
   - Consider removing `DELETE` if not needed
   - Use `PUT` and `POST` carefully

3. **Header Security**
   - The security headers in `firebase.json` provide additional protection
   - Review and adjust `Permissions-Policy` based on your app's needs
   - Consider adding `Content-Security-Policy` header

## Monitoring and Maintenance

1. **Regular Reviews**
   - Review CORS configuration quarterly
   - Check Firebase hosting logs for CORS errors
   - Monitor security header effectiveness

2. **Performance Monitoring**
   - Monitor cache hit rates
   - Check for unnecessary preflight requests
   - Optimize CORS configuration based on usage patterns

## Troubleshooting

### CORS Still Not Working
1. Check browser dev tools for specific error messages
2. Verify the origin is exactly matching (including protocol and port)
3. Ensure Firebase project is properly configured
4. Check if custom domain is properly set up

### Security Headers Not Applied
1. Verify `firebase.json` syntax is correct
2. Check Firebase hosting configuration
3. Test with browser dev tools
4. Review Firebase hosting documentation

### Performance Issues
1. Check cache headers are working
2. Monitor bundle sizes
3. Review lazy loading implementation
4. Consider CDN for static assets
