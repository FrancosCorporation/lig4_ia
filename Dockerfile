FROM node:22-alpine

ENV NODE_ENV=production PORT=3347 HOST=0.0.0.0
WORKDIR /app

COPY --chown=node:node server.js index.html 404.html style.css ./
COPY --chown=node:node js/app.js js/ai-minimax.js js/lig4-rules.js js/llm.js js/erro.js ./js/
COPY --chown=node:node js/vendor/webllm.esm.js ./js/vendor/
COPY --chown=node:node js/vendor/wllama/index.js ./js/vendor/wllama/
COPY --chown=node:node js/vendor/wllama/wasm/wllama.wasm ./js/vendor/wllama/wasm/

USER node
EXPOSE 3347
CMD ["node", "server.js"]
