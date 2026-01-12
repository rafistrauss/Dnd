# Using the D&D Wiki Import Feature

## How to Import Content

### Step 1: Find Content on D&D Wiki

Visit [dnd5e.wikidot.com](https://dnd5e.wikidot.com) and browse for the content you want to add:

- **Spells**: Browse [Spell Lists](https://dnd5e.wikidot.com/spells)
- **Feats**: Check [Feat List](https://dnd5e.wikidot.com/feats)
- **Weapons**: See [Weapon Properties](https://dnd5e.wikidot.com/weapons)

### Step 2: Copy the URL

Copy the full URL from the browser address bar. Examples:

- Spell: `https://dnd5e.wikidot.com/spell:divine-favor`
- Feat: `https://dnd5e.wikidot.com/feat:alert`
- Weapon: `https://dnd5e.wikidot.com/weapon:longsword`

### Step 3: Open Import Modal

Click the **"📚 Import from D&D Wiki"** button at the top of your character sheet.

### Step 4: Paste and Fetch

1. Paste the URL into the text field
2. The system will automatically detect the content type (spell, feat, or weapon)
3. Click **"Fetch"** to retrieve the content

### Step 5: Review and Import

- Review the parsed information in the preview section
- The system extracts relevant stats and descriptions
- Click **"Import to Character Sheet"** to add it to your character

## Where Content Gets Added

### Spells

Added to the **"Prepared Spells"** section in Class Features with format:

```
Spell Name (LevelSchool)
```

### Feats

Added to the **"Features & Traits"** text area with format:

```
Feat Name (Req: Prerequisites)
Description text...
```

### Weapons/Attacks

Added to the **"Attacks"** section as a new attack with:

- Name
- Damage dice (e.g., 1d8)
- Damage type (e.g., slashing)
- Bonus: 0 (you should update this based on your character's stats)

## Troubleshooting

### "Unable to fetch content" Error

The D&D wiki uses anti-scraping measures. If automatic fetching fails:

1. Try the alternative CORS proxy (automatic)
2. Manually copy the content from the wiki page
3. Add it directly to your character sheet

### Incorrect Parsing

The parser extracts content using pattern matching. If information looks incorrect:

1. Visit the source link to verify
2. Manually edit the imported content in your character sheet
3. Report parsing issues if you notice patterns

### Supported Content Types

Currently supports:

- ✅ Spells (spell:\*)
- ✅ Feats (feat:\*)
- ✅ Weapons (weapon:\*)

Not yet supported:

- ❌ Classes
- ❌ Races
- ❌ Monsters
- ❌ Magic Items

## Examples

### Importing Divine Favor Spell

1. URL: `https://dnd5e.wikidot.com/spell:divine-favor`
2. Extracts:
   - Name: Divine Favor
   - Level: 1
   - School: Evocation
   - Casting Time: 1 bonus action
   - Range: Self
   - Components: V, S
   - Duration: Concentration, up to 1 minute

### Importing Alert Feat

1. URL: `https://dnd5e.wikidot.com/feat:alert`
2. Extracts:
   - Name: Alert
   - Benefits:
     - +5 to initiative
     - Can't be surprised
     - No advantage for hidden attackers

### Importing Longsword

1. URL: `https://dnd5e.wikidot.com/weapon:longsword`
2. Extracts:
   - Name: Longsword
   - Type: Melee
   - Damage: 1d8 (or 1d10 versatile)
   - Damage Type: Slashing

## Tips

1. **Spell Slots**: After importing spells, don't forget to set your spell slots in Class Features
2. **Attack Bonuses**: Update attack bonuses based on your proficiency and ability modifiers
3. **Source Links**: Each imported item includes a link back to the wiki for reference
4. **Batch Import**: You can import multiple items one after another
5. **Manual Editing**: All imported content can be edited directly in your character sheet

## Privacy & Copyright

- This feature fetches publicly available content from dnd5e.wikidot.com
- All content remains copyrighted by Wizards of the Coast
- The feature is provided for personal use only
- Source links are preserved to credit the original content
- No content is stored on our servers; all data stays in your browser
