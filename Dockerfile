# syntax=docker/dockerfile:1
#
# Container image for Google Cloud Run (or any container host).
#
# PREVIEW MODE: when BAKE_SAMPLE_DB=true (the default) the sample catalog is
# migrated and seeded into an embedded PGlite database at build time and
# shipped inside the image. That is only suitable while the site is read-only.
# For a real database, build with --build-arg BAKE_SAMPLE_DB=false and set
# DATABASE_URL on the service. See docs/deployment.md.

FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN BUILD_STANDALONE=true npm run build

ARG BAKE_SAMPLE_DB=true
RUN mkdir -p .data/pglite \
 && if [ "$BAKE_SAMPLE_DB" = "true" ]; then \
      DATABASE_URL= PGLITE_DATA_DIR=./.data/pglite npm run db:setup; \
    fi

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080 \
    PGLITE_DATA_DIR=/app/.data/pglite

# The standalone bundle contains the server and only the node_modules it needs.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/.data ./.data

USER node
EXPOSE 8080
CMD ["node", "server.js"]
