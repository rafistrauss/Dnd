# D&D 5e Data Files

This directory contains pre-fetched D&D 5e content data used by the character sheet application.

## Spells (spells.json)

- **Source**: [D&D 5.2 SRD Spells Gist by dmcb](https://gist.github.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912)
- **Total Spells**: 339
- **Coverage**: All SRD 5.2 spells from cantrips to 9th level
- **Format**: JSON array of spell objects

### Spell Object Structure
```json
{
  "name": "Spell Name",
  "level": 0-9,
  "school": "evocation|abjuration|conjuration|etc",
  "classes": ["wizard", "sorcerer", "etc"],
  "actionType": "action|bonusAction|reaction",
  "concentration": true|false,
  "ritual": true|false,
  "castingTime": "optional specific time",
  "range": "distance or self/touch",
  "components": ["v", "s", "m"],
  "material": "optional material component description",
  "duration": "Instantaneous|1 minute|etc",
  "description": "Full spell description",
  "cantripUpgrade": "optional cantrip scaling",
  "higherLevelSlot": "optional higher level effects"
}
```

## Feats (feats.json)

- **Source**: [Open5e API](https://api.open5e.com/feats/)
- **Total Feats**: 74
- **Coverage**: Various D&D 5e sources including SRD, Level Up Advanced 5e, Tome of Heroes
- **Format**: JSON array of feat objects

### Feat Object Structure
```json
{
  "id": "unique-slug",
  "name": "Feat Name",
  "prerequisite": "optional requirement",
  "description": "Full feat description with bullet-pointed effects",
  "source": "source URL"
}
```

## Usage

These files are loaded by the `dndData.ts` utility module and made available to the character sheet components through the WikidotImport modal.

## Updates

### Update Spell Data
Download the latest from the Gist:
```bash
curl -o static/data/spells.json https://gist.githubusercontent.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912/raw/srd-5.2-spells.json
```

### Update Feats Data
Fetch from Open5e API and format:
```bash
curl -s 'https://api.open5e.com/feats/?limit=100' | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
const feats = data.results.map(f => ({
  id: f.slug,
  name: f.name,
  prerequisite: f.prerequisite || undefined,
  description: f.effects_desc?.length > 0 
    ? f.desc + '\\n\\n' + f.effects_desc.map(e => '• ' + e).join('\\n')
    : f.desc,
  source: f.document__url
}));
console.log(JSON.stringify(feats, null, 2));
" > static/data/feats.json
```
