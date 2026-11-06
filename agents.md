# Agent Configuration

## Application and Branches

Use `sveltekit-app/` as the only application source.
Create feature branches from `master` and target `master` with pull requests.
Treat `gh-pages` as generated output.
Do not restore the standalone application or use a separate `sveltekit` release branch.

## Package Manager

Use **bun** instead of npm for all package management and script execution in this workspace.

Examples:
- `bun install` instead of `npm install`
- `bun run check` instead of `npm run check`
- `bun add <package>` instead of `npm install <package>`

