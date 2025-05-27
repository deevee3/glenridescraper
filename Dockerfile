# Use Nginx as the base image
FROM nginx:alpine

# Copy the built files to Nginx's web server directory
COPY public/ /usr/share/nginx/html

# Copy custom nginx config if you have one
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
