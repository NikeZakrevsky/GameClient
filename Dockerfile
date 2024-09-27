# Используем официальный образ Nginx
FROM nginx:alpine

# Копируем статические файлы (HTML, CSS, JS) в папку Nginx
COPY ./ /usr/share/nginx/html

# Открываем порт для связи с клиентом
EXPOSE 80
