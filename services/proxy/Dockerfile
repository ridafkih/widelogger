FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS source
COPY . .

FROM base AS prune
RUN bun install --global turbo
COPY --from=source /app .
RUN turbo prune @lab/proxy --docker

FROM base AS build
COPY --from=prune /app/out/json/ .
RUN bun install --ignore-scripts
COPY --from=prune /app/out/full/ .

FROM base AS runtime
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
COPY --from=prune /app/out/json/ .
RUN bun install --ignore-scripts
COPY --from=build /app/services/proxy/src ./services/proxy/src
COPY --from=build /app/packages/sandbox-sdk/src ./packages/sandbox-sdk/src
COPY --from=build /app/packages/database/src ./packages/database/src
COPY --from=build /app/packages/sandbox-docker/src ./packages/sandbox-docker/src

ENV NODE_ENV=production
EXPOSE 8080

CMD ["bun", "run", "--cwd", "services/proxy", "start"]
