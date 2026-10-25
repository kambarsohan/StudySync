FROM node:22.13.0-alpine AS build

WORKDIR /app
RUN npm install --global --prefix /opt/pnpm pnpm@11.25.0 \
  && test "$(/opt/pnpm/bin/pnpm --version)" = "11.25.0"
ENV PATH="/opt/pnpm/bin:${PATH}"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22.13.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
EXPOSE 3000
CMD ["node", "server.mjs"]
