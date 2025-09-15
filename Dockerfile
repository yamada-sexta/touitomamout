FROM oven/bun:alpine

WORKDIR /app
COPY package.json bun.lock tsconfig.json .eslintrc.json /app/

RUN bun install

COPY src/ /app/src
# COPY scripts/ /app/scripts

CMD ["bun", "/src/index.ts"]
