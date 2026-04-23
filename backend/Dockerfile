FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS development
RUN npm ci
COPY src ./src
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS production
RUN npm ci --omit=dev
COPY src ./src
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/app.js"]
