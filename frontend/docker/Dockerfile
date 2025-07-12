# Use Nginx to serve static content
FROM nginx:alpine

# Copy HTML template to Nginx web root
COPY templatemo_589_lugx_gaming/ /usr/share/nginx/html

# Use custom nginx config if needed
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
