# D&D Character Sheet - Use Mode Guidelines

## Overview

This D&D character sheet application has two modes:
- **Edit Mode**: Used for character creation and configuration (setting up stats, abilities, equipment)
- **Use Mode**: Used during actual gameplay (rolling dice, tracking resources, managing HP)

## Critical Requirement: The `use-enabled` Class

**Any button or input that deals with things a player will use during play (not just during setup/configuration) MUST have the `use-enabled` class.**

### Why This Matters

In Use Mode, most inputs and buttons are automatically disabled to prevent accidental changes to the character's configuration during gameplay. Only elements marked with the `use-enabled` class remain functional.

### When to Use `use-enabled`

Add the `use-enabled` class to buttons and inputs for:

✅ **Gameplay Actions** (should be enabled in Use Mode):
- Dice rolling buttons (attack rolls, damage rolls, ability checks, saving throws)
- HP adjustment inputs (current HP, temp HP, damage/healing)
- Resource tracking (spell slots, class features, hit dice)
- Condition/state tracking checkboxes
- Spell casting level selectors
- Target condition checkboxes (e.g., "target succeeded on save")
- Long rest / short rest buttons
- Death save tracking
- Inspiration tracking

❌ **Configuration Fields** (should be disabled in Use Mode):
- Character name, race, class, level
- Ability scores (STR, DEX, CON, etc.)
- Skills proficiency checkboxes
- Armor class configuration
- Attack name/bonus setup
- Equipment management
- Adding/removing features or attacks

## Examples from the Codebase

### Example 1: Dice Input (DiceRoller.svelte)
```svelte
<input
  class="use-enabled"
  type="number"
  id="d20"
  bind:value={d20Count}
  min="0"
  max="10"
/>
```

### Example 2: Target Save Checkbox (Attacks.svelte)
```svelte
<input
  type="checkbox"
  bind:checked={attack.targetSucceededSave}
  class="use-enabled"
/>
```

### Example 3: Spell Level Selector (Attacks.svelte)
```svelte
<select
  id="castLevel-{attack.id}"
  bind:value={attack.castAtLevel}
  class="spell-level-select use-enabled"
>
  {#each availableLevels as level}
    <option value={level}>Level {level}</option>
  {/each}
</select>
```

### Example 4: Roll Buttons
Roll buttons are automatically enabled in Use Mode through CSS selectors, but you can also explicitly add `use-enabled`:
```svelte
<button class="btn-primary use-enabled" on:click={rollAttack}>
  Roll Attack
</button>
```

## CSS Implementation

The CSS in `src/app.css` handles the use mode behavior:

```css
/* Disable most inputs in use mode (unless marked with .use-enabled) */
body.use-mode input[type='text']:not(.use-enabled),
body.use-mode input[type='number']:not(.use-enabled),
body.use-mode textarea:not(.use-enabled),
body.use-mode select:not(.use-enabled) {
  pointer-events: none;
  background-color: #f5f5f5;
  border-color: #ddd;
}

/* Keep .use-enabled inputs functional in use mode */
body.use-mode input.use-enabled,
body.use-mode textarea.use-enabled,
body.use-mode select.use-enabled {
  pointer-events: auto;
  background-color: white;
  border-color: var(--border-color);
}
```

## Testing Your Changes

When adding new gameplay features:

1. Add the feature with appropriate `use-enabled` classes on interactive elements
2. Switch to Use Mode (click the mode toggle button)
3. Verify that:
   - Configuration fields are disabled (grayed out)
   - Gameplay buttons and inputs remain functional
   - Roll buttons work correctly
   - Resource tracking is editable
4. Switch back to Edit Mode to verify all fields are editable again

## Common Mistakes to Avoid

❌ **DON'T** add `use-enabled` to character configuration fields
❌ **DON'T** forget `use-enabled` on checkboxes for gameplay states
❌ **DON'T** add `use-enabled` to "Add Attack" or "Remove Attack" buttons
✅ **DO** add `use-enabled` to the actual attack roll/damage buttons
✅ **DO** add `use-enabled` to resource counters and checkboxes
✅ **DO** test in both Edit and Use modes

## Legacy Support

The CSS also includes legacy support for specific IDs commonly used during gameplay:
- `#currentHP`
- `#tempHP`
- `#hpAdjust`
- `#hitDiceCurrent`
- Roll buttons (automatically enabled via CSS selectors)

However, for new components, always explicitly use the `use-enabled` class instead of relying on ID-based rules.

## Summary

**The golden rule**: If a player needs to click it, check it, or change it during active gameplay (not just during character setup), it needs the `use-enabled` class.
