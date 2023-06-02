FROM nginx:stable
RUN rm /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY note.txt /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
