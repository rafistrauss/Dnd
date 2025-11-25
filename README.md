# D&D Character Sheet

A mobile-friendly web application for managing your D&D 5e character sheet with dice rolling capabilities.

## Features

- ✅ **Mobile-Responsive Design** - Works perfectly on phones, tablets, and desktop
- 💾 **Local Storage** - Automatically saves your character data in your browser
- 📤 **Export/Import** - Save character sheets as JSON files and import them later
- 🎲 **3D Dice Rolling** - Realistic physics-based 3D dice with sound effects using [sarahRosannaBusch/dice](https://github.com/sarahRosannaBusch/dice)
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
- Watch realistic 3D dice roll with physics simulation
- Hear authentic dice rolling sound effects
- Results appear after the dice settle
- For attacks, roll separately for attack and damage with appropriate dice

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

### ⚠️ Required Setup (First Time Only)

**Before PR previews will work, you must configure GitHub Pages:**

1. **First, deploy the main site to gh-pages:**
   - Go to **Actions** tab
   - Click on "Manual Deploy to GitHub Pages" workflow
   - Click "Run workflow" → select "master" branch → "Run workflow"
   - Wait for the workflow to complete

2. **Then configure GitHub Pages:**
   - Go to **Settings** → **Pages**
   - Under "Build and deployment" → "Source", select **Deploy from a branch**
   - Under "Branch", select **gh-pages** and **/ (root)**
   - Click **Save**
   - Wait a few minutes for GitHub to build and deploy

After these steps, both the root site and PR previews will work from the gh-pages branch.

### Automatic Deployment

Once configured, deployments happen automatically:

- **Main Branch**: Automatically deploys to `https://{username}.github.io/{repository}/`
- **Pull Requests**: Each PR gets a preview deployment at `https://{username}.github.io/{repository}/pr-{number}/`

(Replace `{username}` and `{repository}` with your GitHub username and repository name)

### PR Preview Workflow

When you create or update a pull request:
1. GitHub Actions deploys your PR to a unique subdirectory
2. A bot comment is posted on the PR with the preview link
3. The preview updates automatically when you push new commits
4. The preview is cleaned up when the PR is closed

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
