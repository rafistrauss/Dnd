# D&D Character Sheet - SvelteKit Implementation

## Overview
This is a fully functional D&D 5th Edition character sheet built with SvelteKit, supporting multiple classes and levels with a data-driven configuration system.

## Features Implemented

### 1. Character Management
- **Multiple Classes**: Supports Paladin, Fighter, Rogue, Wizard, Cleric, and Barbarian
- **Subclass Support**: Choose from various subclasses for enhanced character customization
  - **Cleric**: War Domain, Life Domain
  - **Fighter**: Champion, Battle Master
  - **Barbarian**: Path of the Berserker
  - More subclasses can be easily added through the configuration system
- **Dynamic Features**: Class and subclass features automatically appear based on selected class, subclass, and level
- **Ability Scores**: All 6 abilities with automatic modifier calculations
- **Skills**: 18 skills with proficiency tracking and modifier calculations
- **Combat Stats**: HP, AC, Initiative tracking
- **Attacks**: Dynamic attack list with dice notation support

### 2. Dice Rolling
- **Dice Notation Parser**: Supports standard D&D notation (e.g., "1d20+5", "2d6+3")
- **Visual Feedback**: Roll results display in green notification boxes with animations
- **Multiple Roll Types**:
  - Ability checks (STR check, DEX check, etc.)
  - Saving throws with proficiency
  - Skill checks with proficiency
  - Attack rolls
  - Damage rolls

### 3. D&D Wiki Integration
- **Import Spells**: Fetch spell details from dnd5e.wikidot.com URLs
- **Import Feats**: Import feat descriptions and prerequisites
- **Import Weapons/Attacks**: Add weapons with damage dice from the wiki
- **Auto-parsing**: Automatically extracts relevant stats and descriptions
- **Source Links**: Maintains reference links to original wiki pages
- **Supported URLs**: Works with spell:, feat:, and weapon: pages from dnd5e.wikidot.com

### 4. GitHub Gist Integration
- **Save to Gist**: Export your character to a GitHub Gist (public or private with token)
- **Load from Gist**: Import character data from any Gist ID
- **Update Existing**: Can update previously saved Gists
- **Config Persistence**: Remembers your GitHub token and last Gist ID in localStorage

### 5. Data Persistence
- **Auto-save**: Character data automatically saved to localStorage
- **Export/Import JSON**: Download/upload character files as JSON
- **Gist Sync**: Alternative cloud storage via GitHub Gists

### 5. Responsive UI
- **Edit/Use Modes**: Toggle between editing character and using it in play
- **Clean Layout**: Organized sections for all character data
- **Keyboard Navigation**: Accessible with keyboard controls
- **Mobile Friendly**: Responsive design works on all screen sizes

## File Structure

```
sveltekit-app/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── AbilityScores.svelte    # Ability scores with check/save rolls
│   │   │   ├── Attacks.svelte          # Attack list with roll functionality
│   │   │   ├── CharacterInfo.svelte    # Basic character details
│   │   │   ├── ClassFeatures.svelte    # Dynamic class features
│   │   │   ├── CombatStats.svelte      # HP, AC, Initiative
│   │   │   ├── DiceRoller.svelte       # 3D dice modal (optional)
│   │   │   ├── GistModal.svelte        # GitHub Gist save/load UI
│   │   │   ├── Notes.svelte            # Features, equipment, notes
│   │   │   ├── Skills.svelte           # 18 skills with proficiency
│   │   │   └── WikidotImport.svelte    # D&D Wiki import modal
│   │   ├── classConfig.ts              # Class & subclass configurations
│   │   ├── diceUtils.ts                # Dice notation parser & roller
│   │   ├── gistUtils.ts                # GitHub Gist API integration
│   │   ├── stores.ts                   # Reactive character store
│   │   ├── types.ts                    # TypeScript type definitions
│   │   └── wikidotUtils.ts             # D&D Wiki scraping utilities
│   └── routes/
│       └── +page.svelte                # Main application page
├── static/
│   └── libs/                           # 3D dice libraries (Three.js, Cannon.js)
└── package.json
```

## Usage

### Development
```bash
cd sveltekit-app
bun run dev
```

### Build for Production
```bash
bun run build
bun run preview
```

## Rolling Dice

All roll buttons throughout the character sheet now use proper dice rolling:

1. **Ability Checks**: Click "Check" next to any ability score
2. **Saving Throws**: Click "Save" next to any ability score
3. **Skill Checks**: Click "Roll" next to any skill
4. **Attack Rolls**: Click "Roll Attack" on any attack
5. **Damage Rolls**: Click "Roll Damage" on any attack (supports dice notation like "2d6+3")

Results display in green notification boxes for 3 seconds.

## GitHub Gist Integration

### To Save a Character:
1. Click "Save to Gist" in the header
2. Enter your GitHub token (get one from https://github.com/settings/tokens)
   - Token needs `gist` scope for private gists
   - Optional for public gists
3. Optionally enter an existing Gist ID to update
4. Click "Save"

### To Load a Character:
1. Click "Load from Gist" in the header
2. Enter the Gist ID
3. Optionally enter token if it's a private gist
4. Click "Load"

The app remembers your token and last Gist ID in browser localStorage.

## Class Configuration

Classes are configured with:
- Hit dice type
- Primary ability
- Saving throw proficiencies
- Skill options
- Features by level (with checkbox/uses tracking)
- Spell slots (for spellcasters)

Easy to add new classes by extending `classConfig.ts`.

## Future Enhancements

Possible additions:
- 3D dice animation integration (DiceRoller.svelte is ready)
- Spell management system
- Character portrait upload
- Print-friendly CSS
- Dark mode
- Additional classes (Monk, Druid, Bard, etc.)
- Multiclassing support
- Character level-up wizard

## Technologies Used

- **SvelteKit 2.49.0**: Framework
- **TypeScript**: Type safety
- **Vite 7.2.4**: Build tool
- **Bun**: Package manager
- **GitHub Gist API**: Cloud storage
- **Three.js & Cannon.js**: 3D dice physics (optional)
