#!/bin/sh

# Docker entrypoint script for Vanguard Fleet Inspection App

# Replace environment variables in nginx config
envsubst < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Replace environment variables in built files
if [ -f "/usr/share/nginx/html/index.html" ]; then
    envsubst < /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html.tmp
    mv /usr/share/nginx/html/index.html.tmp /usr/share/nginx/html/index.html
fi

# Start nginx
exec "$@"
