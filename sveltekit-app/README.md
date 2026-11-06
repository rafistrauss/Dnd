# D&D 5e Character Sheet

This directory contains the only application in the repository.
SvelteKit builds a static site for GitHub Pages.

## Development

From this directory, install the locked dependencies:

```sh
bun install --frozen-lockfile
```

Start the development server:

```sh
bun run dev
```

## Checks and builds

```sh
bun run test
bun run check
bun run lint
bun run build
bun run preview
```

The test script runs both Vitest and Bun tests.
The build uses `/Dnd` as its production base path.
PR previews use `BASE_PATH=/Dnd/pr-{number}`.

## Features

- Character classes, subclasses, racial traits, and spell slots.
- Level-up choices, ability score improvements, and feats for the 2014 and 2024 rules.
- Weapon mastery, attack contexts, Great Weapon Fighting, Great Weapon Master, and critical hits.
- 3D dice, roll history, combat resources, conditions, and inspiration.
- JSON import and export, browser storage, and optional GitHub Gist storage.
- A printable character sheet at `/print/`.

The content importer reads the local spell and feat catalogs in `static/data/`.
See [the catalog documentation](static/data/README.md) for data sources and update commands.

See [FEATURES.md](FEATURES.md) for feature details.
See [the repository README](../README.md) for branch and deployment rules.
