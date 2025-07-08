FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy phishing site HTML
COPY html/ /usr/share/nginx/html/

EXPOSE 4000

CMD ["nginx", "-g", "daemon off;"] 