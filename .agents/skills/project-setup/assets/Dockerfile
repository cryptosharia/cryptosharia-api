# Production runtime image.
# Bun runs TypeScript directly — there is no build step, so the image ships
# the source files and lets bun execute them.
#
# tsconfig.json is copied because bun reads its `paths` aliases (#src/*, #test/*)
# at runtime.

FROM oven/bun:1

WORKDIR /app

# Install only production dependencies.
# Docker caches layers — if only source code changes (not deps), the cached
# "RUN bun install" layer is reused.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy source + tsconfig (required for path alias resolution)
COPY tsconfig.json src ./

# Create a dedicated non-root user for running the app.
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

# Tell bun/app we're in production mode.
ENV NODE_ENV=production

# Documentation only: the port the container listens on. Not a publish.
EXPOSE 3000

# The ONLY command that runs when a container starts from this image.
CMD ["bun", "run", "start"]