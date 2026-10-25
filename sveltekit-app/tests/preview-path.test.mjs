import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function getBasePath(nodeEnv, basePath) {
  const env = { ...process.env, NODE_ENV: nodeEnv };
  delete env.BASE_PATH;
  if (basePath !== undefined) env.BASE_PATH = basePath;

  return execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import config from './svelte.config.js'; process.stdout.write(config.kit.paths.base);"
    ],
    { cwd: new URL('..', import.meta.url), env, encoding: 'utf8' }
  );
}

test('production deployment keeps the default GitHub Pages base path', () => {
  expect(getBasePath('production')).toBe('/Dnd');
});

test('preview deployment uses the PR-specific base path', () => {
  expect(getBasePath('production', '/Dnd/pr-32')).toBe('/Dnd/pr-32');
});

test('development stays at the root even when a deployment path is provided', () => {
  expect(getBasePath('development', '/Dnd/pr-32')).toBe('');
});

test('main-site deployment preserves existing PR preview directories', () => {
  const workflow = readFileSync(
    new URL('../../.github/workflows/deploy.yml', import.meta.url),
    'utf8'
  );
  expect(workflow).toMatch(/keep_files:\s*true/);
});
