FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS development
RUN npm ci
COPY . .
ENV NODE_ENV=development
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
ENV FRONTEND_PORT=80
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE ${FRONTEND_PORT}
CMD ["nginx", "-g", "daemon off;"]
