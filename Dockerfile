FROM node:20-slim AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends ca-certificates wget && \
    wget -qO /tmp/libssl.deb https://deb.debian.org/debian/pool/main/o/openssl/libssl1.1_1.1.1w-0+deb11u1_amd64.deb && \
    echo "aadf8b4b197335645b230c2839b4517aa444fd2e8f434e5438c48a18857988f7  /tmp/libssl.deb" | sha256sum -c - && \
    dpkg -i /tmp/libssl.deb && rm -f /tmp/libssl.deb && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

COPY --from=frontend-builder /frontend/dist ./frontend/dist

RUN npx prisma generate

RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 3333

CMD ["npx", "tsx", "src/server.ts"]
