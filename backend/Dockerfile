FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS development
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS production
COPY src ./src
RUN npm test
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/app.js"]
