<script lang="ts">
  import type { Spell } from '$lib/types';
  import {
    getSavingThrowInfo,
    requiresSpellAttackRoll,
    isBuffSpell,
    getAlternateDamageForDamagedTarget
  } from '$lib/spellUtils';
  import { getSpellSaveDC } from '$lib/combatUtils';
  import { character } from '$lib/stores';
  import { createEventDispatcher } from 'svelte';

  export let spell: Spell;
  export let spellName: string; // Display name (for customization like "Mage Hand")
  export let specialNotes: string | undefined = undefined; // e.g., "invisible hand"
  export let castAtLevel: number | undefined = undefined;
  export let targetSucceededSave: boolean = false;
  export let targetIsDamaged: boolean = false;
  export let targetIsFiendOrUndead: boolean = false;
  export let spellTarget: 'self' | 'other' = 'self';
  export let availableLevels: number[] = [];
  export let showLevelSelector: boolean = true;
  export let hideComponents: boolean = false; // For racial traits
  export let isEditMode: boolean = false;
  export let showTargetOptions: boolean = true;
  export let forceUtilityMode: boolean = false; // Force "Cast Spell" button for utility spells
  export let disabled: boolean = false; // Disable buttons when out of uses

  const dispatch = createEventDispatcher();

  let collapsedSpellInfo = true;

  function toggleSpellInfo() {
    collapsedSpellInfo = !collapsedSpellInfo;
  }

  function handleCastAtLevelChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    dispatch('castLevelChange', { level: parseInt(target.value) });
  }

  function handleRollAttack() {
    dispatch('rollAttack');
  }

  function handleRollDamage() {
    dispatch('rollDamage');
  }

  function handleCastSpell() {
    console.log('SpellCard: handleCastSpell called, dispatching event');
    dispatch('castSpell', { target: spellTarget });
  }

  function isHealingSpell(spell: Spell): boolean {
    return (
      spell.description.toLowerCase().includes('regain') &&
      (spell.description.toLowerCase().includes('hit point') ||
        spell.description.toLowerCase().includes('hp'))
    );
  }

  function isTargetableSpell(spellName: string): boolean {
    const targetableSpells = ['Shield of Faith', 'Bless', 'Aid', 'Magic Weapon'];
    return targetableSpells.includes(spellName);
  }

  $: savingThrow = getSavingThrowInfo(spell);
  $: alternateDamageInfo = getAlternateDamageForDamagedTarget(spell);
  $: requiresAttackRoll = requiresSpellAttackRoll(spell);
  $: isBuff = isBuffSpell(spell);
  $: isHealing = isHealingSpell(spell);
  $: isTargetable = isTargetableSpell(spell.name);
</script>

<div class="spell-card">
  <div class="spell-header">
    <h3 class="spell-name-header">{spellName}</h3>
    {#if specialNotes}
      <span class="special-note-badge" title={specialNotes}>✨</span>
    {/if}
  </div>

  <div class="spell-type">
    <input
      type="text"
      value="{spell.school} (Lvl {spell.level})"
      readonly
      class="type-display"
    />
  </div>

  <div class="spell-info">
    <div
      class="spell-info-header"
      on:click={toggleSpellInfo}
      on:keydown={(e) => e.key === 'Enter' && toggleSpellInfo()}
      role="button"
      tabindex="0"
    >
      <h4>Spell Info</h4>
      <button class="collapse-btn-small" aria-label={collapsedSpellInfo ? 'Expand' : 'Collapse'}>
        {collapsedSpellInfo ? '▼' : '▲'}
      </button>
    </div>
    {#if !collapsedSpellInfo}
      <ul>
        <li><strong>Level:</strong> {spell.level}</li>
        <li>
          <strong>Casting Time:</strong>
          {spell.castingTime || spell.actionType}
        </li>
        <li><strong>Range:</strong> {spell.range}</li>
        {#if !hideComponents}
          <li>
            <strong>Components:</strong>
            {spell.components.join(', ')}{#if spell.material}
              ({spell.material}){/if}
          </li>
        {/if}
        <li>
          <strong>Duration:</strong>
          {#if spell.concentration}Concentration,
          {/if}{spell.duration}
        </li>
        <li><strong>Description:</strong> {spell.description}</li>
        {#if spell.higherLevelSlot}
          <li><strong>At Higher Levels:</strong> {spell.higherLevelSlot}</li>
        {/if}
      </ul>
    {/if}
  </div>

  {#if specialNotes}
    <div class="special-notes-display">
      <em>{specialNotes}</em>
    </div>
  {/if}

  {#if savingThrow}
    <div class="target-condition">
      <label>
        <input type="checkbox" bind:checked={targetSucceededSave} class="use-enabled" />
        Target succeeded on {savingThrow.ability.charAt(0).toUpperCase() +
          savingThrow.ability.slice(1)} save
        {#if $character.class}
          <span class="scaled-damage" style="margin-left: 8px;">
            (Spell Save DC: {getSpellSaveDC($character, $character.abilities)})
          </span>
        {/if}
        {#if targetSucceededSave && savingThrow.halfDamageOnSave}
          <span class="scaled-damage">(Half damage)</span>
        {:else if targetSucceededSave && savingThrow.noDamageOnSave}
          <span class="scaled-damage">(No damage)</span>
        {/if}
      </label>
    </div>
  {/if}

  {#if alternateDamageInfo}
    <div class="target-condition">
      <label>
        <input type="checkbox" bind:checked={targetIsDamaged} class="use-enabled" />
        Target is missing HP
        {#if targetIsDamaged}
          <span class="scaled-damage"
            >({alternateDamageInfo.alternateDamage}, scaled with higher levels)</span
          >
        {:else}
          <span class="scaled-damage">({alternateDamageInfo.baseDamage})</span>
        {/if}
      </label>
    </div>
  {/if}

  {#if spell.higherLevelSlot && spell.level > 0 && showLevelSelector}
    {#if availableLevels.length > 0}
      <div class="spell-level-selector">
        <label for="castLevel">Cast at Level:</label>
        <select
          id="castLevel"
          value={castAtLevel || spell.level}
          on:change={handleCastAtLevelChange}
          class="spell-level-select use-enabled"
        >
          {#each availableLevels as level}
            <option value={level}>
              Level {level}
            </option>
          {/each}
        </select>
      </div>
      {#if spell.description.includes('Fiend or an Undead')}
        <div class="target-condition">
          <label>
            <input type="checkbox" bind:checked={targetIsFiendOrUndead} class="use-enabled" />
            Target is Fiend or Undead
            {#if targetIsFiendOrUndead}
              <span class="scaled-damage">(+1d8 extra damage)</span>
            {/if}
          </label>
        </div>
      {/if}
    {:else}
      <div class="spell-level-selector">
        <span style="color: #dc3545; font-weight: bold;">No spell slots available!</span>
      </div>
    {/if}
  {/if}

  <div class="spell-actions">
    {#if requiresAttackRoll}
      <button on:click={handleRollAttack} class="btn btn-primary use-enabled">Roll Attack</button>
    {:else if isBuff || forceUtilityMode}
      {#if isTargetable && showTargetOptions && !forceUtilityMode}
        <div class="buff-target-selection">
          <div class="target-options">
            <label class="target-option">
              <input type="radio" bind:group={spellTarget} value="self" name="target-spell" />
              Self
            </label>
            <label class="target-option">
              <input type="radio" bind:group={spellTarget} value="other" name="target-spell" />
              Other
            </label>
          </div>
          <button
            on:click={handleCastSpell}
            class="btn btn-info use-enabled"
            {disabled}
            class:disabled-button={disabled}
          >
            Cast {spell.name}
          </button>
        </div>
      {:else}
        <button
          on:click={handleCastSpell}
          class="btn btn-info use-enabled"
          {disabled}
          class:disabled-button={disabled}
        >
          Cast {spell.name}
        </button>
      {/if}
    {:else}
      <button
        on:click={handleRollDamage}
        class="btn {isHealing ? 'btn-success' : 'btn-secondary'} use-enabled"
      >
        {#if isHealing}
          Roll Healing
        {:else}
          Roll Damage
        {/if}
      </button>
    {/if}
  </div>
</div>

<style>
  .spell-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 1rem;
  }

  .spell-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .spell-name-header {
    color: #8b0000;
    font-size: 1.3rem;
    margin: 0;
    font-weight: bold;
  }

  .special-note-badge {
    font-size: 1.1rem;
    cursor: help;
  }

  .spell-type {
    margin-bottom: 1rem;
  }

  .type-display {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: white;
    font-size: 0.95rem;
    cursor: default;
  }

  .spell-info {
    margin-bottom: 1rem;
    padding: 10px;
    background-color: #e9f5ff;
    border: 1px solid #b3e0ff;
    border-radius: 4px;
  }

  .spell-info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
  }

  .spell-info-header:hover {
    opacity: 0.8;
  }

  .spell-info h4 {
    margin: 0 0 10px 0;
    font-size: 1.1rem;
    color: #007bff;
  }

  .collapse-btn-small {
    background: none;
    border: none;
    font-size: 0.9rem;
    cursor: pointer;
    color: #007bff;
    padding: 0;
    transition: transform 0.2s ease;
  }

  .collapse-btn-small:hover {
    transform: scale(1.1);
  }

  .spell-info ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  .spell-info li {
    margin-bottom: 5px;
  }

  .special-notes-display {
    margin-bottom: 1rem;
    padding: 0.5rem;
    background-color: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    color: #856404;
    font-size: 0.9rem;
  }

  .target-condition {
    margin-top: 10px;
    padding: 10px;
    background-color: #fff3e0;
    border: 1px solid #ffcc80;
    border-radius: 4px;
  }

  .target-condition label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: normal;
    cursor: pointer;
  }

  .target-condition input[type='checkbox'] {
    cursor: pointer;
    width: 16px;
    height: 16px;
  }

  .spell-level-selector {
    margin-top: 10px;
    padding: 10px;
    background-color: #e7f3ff;
    border: 1px solid #b3d9ff;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .spell-level-selector label {
    font-weight: bold;
    font-size: 0.9rem;
  }

  .spell-level-select {
    padding: 5px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .scaled-damage {
    font-weight: bold;
    color: #007bff;
    font-size: 0.9rem;
  }

  .spell-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 1rem;
  }

  .buff-target-selection {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .target-options {
    display: flex;
    gap: 15px;
    padding: 8px 12px;
    background-color: #f0f8ff;
    border: 1px solid #b3d9ff;
    border-radius: 4px;
  }

  .target-option {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: normal;
    cursor: pointer;
    margin: 0;
  }

  .target-option input[type='radio'] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    margin: 0;
  }

  .disabled-button {
    opacity: 0.5;
    cursor: not-allowed !important;
  }

  .disabled-button:hover {
    transform: none !important;
  }
</style>
