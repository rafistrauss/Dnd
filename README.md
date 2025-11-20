# D&D Character Sheet

A mobile-friendly web application for managing your D&D 5e character sheet with dice rolling capabilities.

## Features

- ✅ **Mobile-Responsive Design** - Works perfectly on phones, tablets, and desktop
- 💾 **Local Storage** - Automatically saves your character data in your browser
- 📤 **Export/Import** - Save character sheets as JSON files and import them later
- 🎲 **Dice Rolling** - Roll ability checks, saving throws, skills, attacks, and damage
- ⚔️ **Attack Management** - Add and manage multiple attacks with custom modifiers
- 📊 **Auto-Calculations** - Automatically calculates modifiers, saves, and skill bonuses

## How to Use

### Basic Setup

1. Open `index.html` in your web browser
2. Fill in your character information (name, class, level, race, etc.)
3. Enter your ability scores - modifiers are calculated automatically
4. Set your proficiency bonus (updates automatically based on level)
5. Check the boxes for proficient saves and skills

### Rolling Dice

- Click any "Roll" button next to abilities, saves, or skills
- Results appear in a modal with the d20 roll and total
- For attacks, roll separately for attack and damage

### Managing Attacks

1. Click "Add Attack" to create a new attack entry
2. Fill in the attack name, bonus, damage dice (e.g., "2d6+3"), and damage type
3. Use "Roll Attack" for attack rolls and "Roll Damage" for damage rolls
4. Remove attacks with the "Remove" button

### Saving Your Character

- **Save** - Stores character in browser's local storage (persists between sessions)
- **Export** - Downloads character as a JSON file for backup
- **Import** - Load a previously exported character file

## GitHub Pages Deployment

To host this on GitHub Pages:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add D&D character sheet app"
   git push origin master
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click on "Settings"
   - Scroll down to "Pages" section
   - Under "Source", select "master" branch
   - Click "Save"

3. **Access Your App:**
   - Your app will be available at: `https://rafistrauss.github.io/Dnd/`
   - It may take a few minutes to deploy

## Mobile Tips

- The app is optimized for touch interactions
- Portrait and landscape orientations are supported
- All form fields are touch-friendly sized
- Modal dialogs work well on mobile screens

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## Data Privacy

- All character data is stored locally in your browser
- No data is sent to any server
- Export your characters regularly as backup

## Customization

Feel free to modify:
- Color scheme in `styles.css` (`:root` variables)
- Add more fields in `index.html`
- Extend functionality in `app.js`

## License

Free to use and modify for personal use.
