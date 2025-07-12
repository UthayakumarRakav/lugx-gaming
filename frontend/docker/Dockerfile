# Stage 1: Build
FROM node:18 as build
WORKDIR /app
COPY . .
RUN if [ -f package.json ]; then npm install && npm run build; fi

# Stage 2: Serve
FROM nginx:alpine

# Copy build output from stage 1 — adjust if your build output is in /app/build or /app/dist
COPY templatemo_589_lugx_gaming/ /usr/share/nginx/html

# Copy nginx config from context
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
