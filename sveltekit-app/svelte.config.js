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
      // Set base path for GitHub Pages (will be /Dnd or repo name)
      base: process.env.NODE_ENV === 'production' ? '/Dnd' : ''
    }
  }
};

export default config;
