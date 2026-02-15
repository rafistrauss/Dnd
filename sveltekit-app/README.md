# D&D 5e Character Sheet - SvelteKit

A fully functional D&D 5th Edition character sheet built with SvelteKit, featuring class/subclass support, dice rolling, and integration with dnd5e.wikidot.com for importing spells, feats, and items.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Features

### Browse & Add D&D Content

Click the **"📚 Import from D&D Wiki"** button to browse and add spells and feats to your character:

1. **Spells**:
   - Browse a library of pre-loaded spells
   - Filter by spell level (Cantrip through Level 9)
   - Search by name, school, or description
   - View full spell details before adding
   - Adds to your prepared spells list

2. **Feats**:
   - Browse all available feats
   - Search by name or description
   - View prerequisites and benefits
   - Adds to your character's features section

**Note**: The spell/feat data is fetched during development and stored locally. To update or add more content, run:

```bash
npm run fetch-data
```

This will fetch the latest data from dnd5e.wikidot.com and update the local JSON files.

### Other Features

- **Subclass Support**: Choose from various subclasses (War Domain Cleric, Champion Fighter, etc.)
- **Dice Rolling**: Integrated dice roller with proper D&D notation support
- **Data Persistence**: Auto-save to localStorage
- **GitHub Gist Integration**: Save/load characters to the cloud
- **Import/Export**: JSON file support for sharing characters

See [FEATURES.md](FEATURES.md) for complete feature list.
