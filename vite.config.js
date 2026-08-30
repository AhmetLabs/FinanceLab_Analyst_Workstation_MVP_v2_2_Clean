import { defineConfig, loadEnv } from 'vite';
import { sites } from '@openai/sites-vite-plugin';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { createDevMiddleware } from './server/index.js';

const SECRET_NAME = ['KIMI', 'API', 'KEY'].join('_');

function financeLabServer() {
  return {
    name: 'financelab-server-entry',
    apply: 'build',
    async buildStart() {
      await rm(new URL('./dist/', import.meta.url), { recursive: true, force: true });
    },
    async closeBundle() {
      await mkdir(new URL('./dist/server/', import.meta.url), { recursive: true });
      await copyFile(new URL('./server/index.js', import.meta.url), new URL('./dist/server/index.js', import.meta.url));
    },
  };
}

function financeLabLocalApi(mode) {
  const serverEnvironment = loadEnv(mode, process.cwd(), '');
  return {
    name: 'financelab-local-api',
    configureServer(server) {
      server.middlewares.use(createDevMiddleware({ apiKey: serverEnvironment[SECRET_NAME] }));
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [financeLabLocalApi(mode), sites(), financeLabServer()],
  build: {
    outDir: 'dist/client',
  },
}));
