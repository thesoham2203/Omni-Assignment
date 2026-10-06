FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& npm ci \
	&& apt-get purge -y --auto-remove python3 make g++ \
	&& rm -rf /var/lib/apt/lists/* /root/.npm

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/server/data/app.db

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& npm ci --omit=dev \
	&& apt-get purge -y --auto-remove python3 make g++ \
	&& rm -rf /var/lib/apt/lists/* /root/.npm

COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server/dist ./server/dist

RUN mkdir -p /app/server/data && chown -R node:node /app
USER node

EXPOSE 3001
CMD ["sh", "-c", "node server/dist/server/src/db/seed.js && node server/dist/server/src/index.js"]