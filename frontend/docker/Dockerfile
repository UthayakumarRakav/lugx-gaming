# Stage 1: Build
FROM node:18 as build

WORKDIR /app
COPY . .
# If the template needs npm install/build
RUN if [ -f package.json ]; then npm install && npm run build; fi

# Stage 2: Serve
FROM nginx:alpine

# Copy the static files (adjust paths based on template structure)
COPY ./ /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
