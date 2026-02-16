FROM node:22-alpine AS build

WORKDIR /app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG VITE_BACKEND_URL=/backend
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
