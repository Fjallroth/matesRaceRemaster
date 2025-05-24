# Use an official Nginx image
FROM nginx:alpine

# Copy the static build files from the 'dist' directory to Nginx's web server directory
COPY dist/ /usr/share/nginx/html

# Optional: Copy a custom Nginx configuration file if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Command to run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]