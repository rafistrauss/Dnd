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

This repository is configured with automatic deployment to GitHub Pages using GitHub Actions.

### Automatic Deployment

- **Main Branch**: Automatically deploys to `https://{username}.github.io/{repository}/`
- **Pull Requests**: Each PR gets a preview deployment at `https://{username}.github.io/{repository}/pr-{number}/`

(Replace `{username}` and `{repository}` with your GitHub username and repository name)

### PR Preview Workflow

When you create or update a pull request:
1. A preview is automatically deployed to a unique URL
2. A comment is posted on the PR with the preview link
3. The preview updates automatically when you push new commits
4. The preview is cleaned up when the PR is closed

### Manual Setup (First Time Only)

If GitHub Pages is not yet enabled:

1. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click on "Settings"
   - Scroll down to "Pages" section
   - Under "Source", select "gh-pages" branch
   - Click "Save"

2. **Wait for Deployment:**
   - GitHub Actions will automatically deploy on the next push
   - Check the "Actions" tab to see deployment status
   - Your app will be available at: `https://{username}.github.io/{repository}/`

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
