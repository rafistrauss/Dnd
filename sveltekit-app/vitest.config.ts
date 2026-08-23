import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    alias: {
      $lib: resolve(root, 'src/lib'),
      '$app/paths': resolve(root, 'src/test/mocks/app-paths.ts'),
      '$app/environment': resolve(root, 'src/test/mocks/app-environment.ts')
    },
    conditions: ['browser']
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts']
  }
});
