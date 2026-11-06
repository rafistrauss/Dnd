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

### Fighter and Goliath resources (2024 rules)

Second Wind tracks the level-based use limit. A Short Rest restores one use.
A Long Rest restores all uses. The Second Wind roll applies healing and spends
the Bonus Action when you close the dice dialog. Tactical Mind uses the same
resource. After its roll turns a failed check into a success, use the
`Check succeeded` button to spend one Second Wind use.

Champion Initiative and Athletics rolls use Advantage from level 3.
Armor that imposes Stealth Disadvantage also changes the Stealth roll.
The dice dialog rolls two d20s and keeps the appropriate result.

Weapon Mastery records weapon types in Class Features. A level-4 Fighter can
choose four types. An attack only shows its mastery effect if its weapon name
matches a recorded type. Older characters without this list retain their
existing attack mastery effects.

Goliath traits track Giant Ancestry uses by Proficiency Bonus. Large Form becomes
available at level 5. The trait buttons spend resources, but targets, damage,
movement, size changes, and conditions need manual updates.
Musician shows its rest benefit and ally limit. Record the three instrument
proficiencies in Equipment. Apply Heroic Inspiration on each chosen ally's sheet.

Hew appears in the melee weapon attack-context menu. Its trigger and the
same-weapon requirement need manual tracking. Heavy Weapon Mastery adds damage
only in the Attack action context. Select another context for attacks outside
the Attack action on your turn.

The content importer reads the local spell and feat catalogs in `static/data/`.
See [the catalog documentation](static/data/README.md) for data sources and update commands.

See [FEATURES.md](FEATURES.md) for feature details.
See [the repository README](../README.md) for branch and deployment rules.
