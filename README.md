# D&D Character Sheet

A mobile-friendly D&D 5e character sheet built with SvelteKit.

**Live application:** https://rafistrauss.github.io/Dnd/

## Application

`sveltekit-app/` contains the only application. The repository no longer contains the standalone HTML and JavaScript application.

The sheet supports character advancement, feats, spell slots, racial traits, weapon mastery, combat resources, 3D dice, and printable sheets.
Character data stays in browser storage unless you export it or save it to a GitHub Gist.

## Development

Use Bun for dependencies and scripts.

```sh
cd sveltekit-app
bun install --frozen-lockfile
bun run dev
```

Open the local URL that Vite shows.

## Checks and builds

Run these commands from `sveltekit-app/`:

```sh
bun run test
bun run check
bun run lint
bun run build
```

`bun run test` runs the component tests with Vitest and the advancement tests with Bun.
`bun run build` creates the static site in `sveltekit-app/build/`.
`bun run preview` serves that build locally.

## Branches

| Branch                       | Purpose                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `master`                     | The default branch and the only source for production deployments.                  |
| Short-lived feature branches | Changes proposed through pull requests into `master`.                               |
| `gh-pages`                   | Generated production files and PR previews. No application development occurs here. |

Create feature branches from `master`.
Target `master` with every new pull request.
After a pull request merges, delete its feature branch.
Do not use `sveltekit` as a separate development or release branch.

Until the old `sveltekit` branch is deleted, do not push to it.
Its historical deployment workflow can still overwrite production.

The consolidation combines the live `sveltekit` version at `9778d2b` with the `master` version at `e048233`.
It preserves the level-up features from `sveltekit` and the print, weapon mastery, and combat fixes from `master`.
The Git history retains both branches.
Use a merge commit for the consolidation pull request to preserve this ancestry.

Before deleting an older branch, compare its changes with `master`.
Retarget an open pull request to `master` only if its changes remain necessary.
Close superseded pull requests before deleting their branches.

## GitHub Pages

The deployment workflow builds `sveltekit-app/` after a push to `master`.
It publishes the build to the root of `gh-pages`.
For a manual deployment, run **Deploy to GitHub Pages** from `master`.
The workflow refuses production deployments from other branches.

The repository Pages configuration uses **Deploy from a branch**, with `gh-pages` and `/ (root)`.
The deployment and preview workflows serialize writes to `gh-pages`.
Production deployments preserve existing PR previews.

Pull requests into `master` receive a preview at `https://rafistrauss.github.io/Dnd/pr-{number}/`.
Each preview uses its own base path.
The preview workflow deletes the preview after the pull request closes.

## Source layout

- `sveltekit-app/src/routes/`: application routes, including the print sheet.
- `sveltekit-app/src/lib/`: character state, rules, and Svelte components.
- `sveltekit-app/static/`: spell data, feat data, images, and dice assets.
- `sveltekit-app/src/test/`: Vitest component and combat tests.
- `sveltekit-app/tests/`: Bun advancement, feat, and deployment tests.
- `.github/workflows/`: formatting, tests, builds, production deployment, and PR previews.

See [the application documentation](sveltekit-app/README.md) for feature details.

## License

Free to use and modify for personal use.
