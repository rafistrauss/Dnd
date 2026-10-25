import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      // Output to 'build' directory
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true
    }),
    paths: {
      // Preview deployments use a PR-specific subdirectory on GitHub Pages.
      base: process.env.NODE_ENV === 'production' ? (process.env.BASE_PATH ?? '/Dnd') : ''
    }
  }
};

export default config;
