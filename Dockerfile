FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends ca-certificates wget && \
    wget -qO /tmp/libssl.deb http://deb.debian.org/debian/pool/main/o/openssl/libssl1.1_1.1.1w-0+deb11u1_amd64.deb && \
    dpkg -i /tmp/libssl.deb && rm -f /tmp/libssl.deb && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate

EXPOSE 3333

CMD ["npx", "tsx", "src/server.ts"]
