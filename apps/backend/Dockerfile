# Build: docker build -t perplx-backend .
# Run:   docker run -p 3001:3001 --env-file .env perplx-backend

FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY index.ts ./
COPY lib ./lib/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["bun", "run", "index.ts"]
