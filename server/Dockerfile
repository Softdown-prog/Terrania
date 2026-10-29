FROM node:22-alpine AS build
WORKDIR /work/server
# As regras compartilhadas em /work/src precisam herdar type=module no NodeNext.
COPY package.json /work/package.json
COPY server/package*.json ./
RUN npm ci --no-audit --no-fund
COPY server/tsconfig.json ./
COPY server/src ./src
COPY src/actors /work/src/actors
COPY src/world /work/src/world
COPY src/shared /work/src/shared
COPY src/engine/combat.ts /work/src/engine/combat.ts
# smoke-test: verifica que as regras compartilhadas foram emitidas como ES Modules.
RUN npm run build \
    && node --input-type=module -e "Promise.all([import('./dist/server/src/Room.js'),import('./dist/src/world/terrain.js')]).then(([r,t])=>{if(typeof r.Room!=='function'||!Number.isFinite(t.CHUNK_PIXELS))process.exit(1)})" \
    && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production PORT=8787
WORKDIR /app
RUN chown node:node /app
COPY --from=build --chown=node:node /work/server/dist ./dist
COPY --from=build --chown=node:node /work/server/node_modules ./node_modules
COPY --from=build --chown=node:node /work/server/package.json ./package.json
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server/src/main.js"]
