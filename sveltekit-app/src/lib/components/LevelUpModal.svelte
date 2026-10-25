<script lang="ts">
  import { onMount } from 'svelte';
  import { character, getLevelUpPreview, applyLevelUp, toasts } from '$lib/stores';
  import { rollFromNotation } from '$lib/diceUtils';
  import { getClassConfig, isSpellcaster } from '$lib/classConfig';
  import { loadFeats, searchFeats } from '$lib/dndData';
  import type { Feat } from '$lib/dndData';
  import type { AbilityName, LevelUpChoices } from '$lib/types';
  import {
    ABILITY_NAMES,
    gainsAbilityImprovement,
    getSubclassChoices,
    validateLevelUpChoices
  } from '$lib/advancement';
  import type { LevelUpPreview } from '$lib/stores';

  export let isOpen = false;
  export let onClose: () => void = () => {};

  let hpGainMethod: 'average' | 'roll' | 'reuse' = 'average';
  let hpRollValue: number | null = null;
  let hpRollModifier: number = 0;
  let preview: LevelUpPreview | null = null;
  let isRolling = false;
  let storedHPAvailable: boolean = false;
  let storedHPValue: number = 0;
  let improvement: 'asi' | 'feat' = 'asi';
  let abilityIncreases: Partial<Record<AbilityName, number>> = {};
  let feats: Feat[] = [];
  let featSearch = '';
  let featId = '';
  let customFeatName = '';
  let customFeatDescription = '';
  let featConfirmed = false;
  let subclass = '';
  let choiceNotes = '';

  onMount(async () => {
    feats = await loadFeats();
  });

  $: earnsImprovement = gainsAbilityImprovement($character.class, $character.level + 1);
  $: subclassOptions = getSubclassChoices($character, $character.level + 1);
  $: selectedFeat = feats.find((feat) => feat.id === featId);
  $: choices = {
    ...(earnsImprovement
      ? {
          improvement,
          abilityIncreases,
          ...(improvement === 'feat'
            ? {
                feat:
                  featId === 'custom'
                    ? { name: customFeatName.trim(), description: customFeatDescription.trim() }
                    : selectedFeat,
                featConfirmed
              }
            : {})
        }
      : {}),
    ...(subclassOptions.length ? { subclass } : {}),
    notes: choiceNotes
  } satisfies LevelUpChoices;
  $: choiceError = validateLevelUpChoices($character, choices);
  $: hpRollModifier = preview?.conMod ?? 0;

  $: if (!isOpen) {
    hpGainMethod = 'average';
    hpRollValue = null;
    improvement = 'asi';
    abilityIncreases = {};
    featId = '';
    featSearch = '';
    customFeatName = '';
    customFeatDescription = '';
    featConfirmed = false;
    subclass = '';
    choiceNotes = '';
  }

  $: {
    if (isOpen) {
      preview = getLevelUpPreview(choices);
      // Check if this level was visited before
      if (preview) {
        const prevHP = $character.hpByLevel?.[preview.newLevel];
        storedHPAvailable = prevHP !== undefined && prevHP > 0;
        storedHPValue = prevHP || 0;
      }
    }
  }

  $: maxHPAfter = preview
    ? hpGainMethod === 'reuse' && storedHPAvailable
      ? storedHPValue +
        (preview.conMod - Math.floor(($character.abilities.constitution - 10) / 2)) *
          preview.newLevel
      : preview.maxHPCurrent +
        preview.constitutionHPBonus +
        (hpGainMethod === 'roll' && hpRollValue !== null
          ? Math.max(1, hpRollValue + preview.conMod)
          : preview.hpGainAverage)
    : 0;

  function rollForHPGain() {
    if (!$character.class) return;

    const classConfig = getClassConfig($character.class);
    if (!classConfig) return;

    isRolling = true;
    const result = rollFromNotation(`1${classConfig.hitDice}`);
    hpRollValue = result.rolls[0]; // Just the die roll, not total
    isRolling = false;
  }

  function handleConfirm() {
    if (!preview) return;

    if (hpGainMethod === 'roll' && hpRollValue === null) {
      toasts.add('Please roll for HP gain first', 'error');
      return;
    }

    let finalHPGain: number | undefined;
    if (hpGainMethod === 'roll') {
      finalHPGain = hpRollValue ?? undefined;
    } else if (hpGainMethod === 'reuse') {
      finalHPGain = undefined; // Signal to use stored HP
    }

    if (!applyLevelUp(hpGainMethod, finalHPGain, choices)) {
      toasts.add(
        choiceError || 'Unable to apply this level-up. Please review your choices.',
        'error'
      );
      return;
    }
    toasts.add(`Leveled up to ${preview.newLevel}! HP restored, resources recharged.`, 'success');
    isOpen = false;
    onClose();
  }

  function handleCancel() {
    isOpen = false;
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancel();
    }
  }
</script>

{#if isOpen && preview}
  <div class="modal-overlay" on:click={handleCancel} on:keydown={handleKeydown} role="presentation">
    <div
      class="modal-content"
      on:click={(e) => e.stopPropagation()}
      on:keydown={(e) => {
        handleKeydown(e);
        e.stopPropagation();
      }}
      role="dialog"
      aria-labelledby="level-up-title"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2 id="level-up-title">Level Up to {preview.newLevel}</h2>
        <button class="close-btn" on:click={handleCancel} aria-label="Close level up dialog"
          >✕</button
        >
      </div>

      <div class="modal-body">
        {#if subclassOptions.length}
          <div class="section advancement-section">
            <h3>Choose a Subclass</h3>
            <label for="level-up-subclass">Subclass</label>
            <select id="level-up-subclass" bind:value={subclass}>
              <option value="">Choose a subclass</option>
              {#each subclassOptions as option}
                <option value={option.id}>{option.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        {#if earnsImprovement}
          <div class="section advancement-section">
            <h3>Ability Score Improvement or Feat</h3>
            <label for="level-up-improvement">Choose your improvement</label>
            <select
              id="level-up-improvement"
              bind:value={improvement}
              on:change={() => {
                abilityIncreases = {};
                featConfirmed = false;
              }}
            >
              <option value="asi">Ability Score Improvement</option>
              <option value="feat">Feat</option>
            </select>
            {#if improvement === 'feat'}
              <label for="level-up-feat-search">Search feats</label>
              <input id="level-up-feat-search" type="search" bind:value={featSearch} />
              <label for="level-up-feat">Feat</label>
              <select
                id="level-up-feat"
                bind:value={featId}
                on:change={() => {
                  abilityIncreases = {};
                  featConfirmed = false;
                }}
              >
                <option value="">Choose a feat</option>
                <option value="custom">Custom / another source</option>
                {#each searchFeats(feats, featSearch) as feat}
                  <option value={feat.id}>{feat.name}</option>
                {/each}
              </select>
              {#if featId === 'custom'}
                <label for="level-up-feat-name">Feat name</label>
                <input id="level-up-feat-name" type="text" bind:value={customFeatName} />
                <label for="level-up-feat-description">Feat benefits and prerequisites</label>
                <textarea id="level-up-feat-description" bind:value={customFeatDescription}
                ></textarea>
              {:else if selectedFeat}
                {#if selectedFeat.prerequisite}<p>{selectedFeat.prerequisite}</p>{/if}
                <p class="choice-description">{selectedFeat.description}</p>
              {/if}
              <p>
                Only selected ability increases are applied automatically. Record other choices
                below and update proficiencies, attacks, spells, or other feat effects on your
                sheet.
              </p>
              <label class="radio-label">
                <input type="checkbox" bind:checked={featConfirmed} />
                I have checked the prerequisites and any manual effects with my DM.
              </label>
            {:else}
              <p>Add +2 to one ability or +1 to two abilities, to a maximum score of 20.</p>
            {/if}
            <p>
              {improvement === 'feat'
                ? 'Ability increases granted by this feat only (if any):'
                : 'Allocate 2 points:'}
            </p>
            <div class="ability-choices">
              {#each ABILITY_NAMES as ability}
                <label for={`level-up-${ability}`}>
                  {ability} ({$character.abilities[ability]} → {$character.abilities[ability] +
                    (abilityIncreases[ability] ?? 0)})
                </label>
                <input
                  id={`level-up-${ability}`}
                  type="number"
                  min="0"
                  max={Math.max(0, Math.min(2, 20 - $character.abilities[ability]))}
                  value={abilityIncreases[ability] ?? 0}
                  on:input={(event) => {
                    abilityIncreases = {
                      ...abilityIncreases,
                      [ability]: event.currentTarget.valueAsNumber
                    };
                  }}
                />
              {/each}
            </div>
          </div>
        {/if}

        {#if preview.newFeatures.length}
          <div class="section">
            <h3>New Class Features</h3>
            {#each preview.newFeatures as feature}
              <details>
                <summary>{feature.name}</summary>
                <p class="choice-description">{feature.description}</p>
              </details>
            {/each}
          </div>
        {/if}

        <div class="section advancement-section">
          <label for="level-up-notes">Other choices / notes</label>
          <textarea
            id="level-up-notes"
            bind:value={choiceNotes}
            placeholder="Record fighting styles, expertise, spells, or other choices here."
          ></textarea>
          <p>
            Saved in Features &amp; Traits. Choices not modeled by the app need manual sheet
            updates.
          </p>
          {#if isSpellcaster($character.class, subclass || $character.subclass)}
            <p>Review your spells and prepared spells in Class Features after leveling up.</p>
          {/if}
        </div>

        <!-- HP Section -->
        <div class="section">
          <h3>Hit Points</h3>
          <div class="hp-preview">
            <div class="hp-row">
              <span class="label">Current Max HP:</span>
              <span class="value">{preview.maxHPCurrent}</span>
            </div>
            <div class="hp-row">
              <span class="label">Constitution Modifier:</span>
              <span class="value">{preview.conMod >= 0 ? '+' : ''}{preview.conMod}</span>
            </div>
            <div class="hp-row highlight">
              <span class="label">New Max HP:</span>
              <span class="value">{maxHPAfter}</span>
            </div>
            {#if preview.constitutionHPBonus}
              <p>
                Includes +{preview.constitutionHPBonus} HP for previous levels from your Constitution
                increase.
              </p>
            {/if}
            <div class="hp-row">
              <span class="label">Current HP will be restored to:</span>
              <span class="value">{maxHPAfter}</span>
            </div>
          </div>

          <div class="hp-gain-selector">
            <div class="radio-group">
              <label class="radio-label">
                <input
                  type="radio"
                  bind:group={hpGainMethod}
                  value="average"
                  disabled={isRolling}
                />
                <span>Use Average: +{preview.hpGainAverage} HP</span>
              </label>
            </div>

            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" bind:group={hpGainMethod} value="roll" disabled={isRolling} />
                <span>Roll Hit Die</span>
              </label>
              {#if hpGainMethod === 'roll'}
                <div class="roll-controls">
                  <button class="roll-btn" on:click={rollForHPGain} disabled={isRolling}>
                    {isRolling ? 'Rolling...' : '🎲 Roll'}
                  </button>
                  {#if hpRollValue !== null}
                    <span class="roll-result">
                      Roll: {hpRollValue} + {hpRollModifier} =
                      <strong>{Math.max(1, hpRollValue + hpRollModifier)} HP</strong>
                    </span>
                  {/if}
                </div>
              {/if}
            </div>

            {#if storedHPAvailable}
              <div class="radio-group">
                <label class="radio-label">
                  <input
                    type="radio"
                    bind:group={hpGainMethod}
                    value="reuse"
                    disabled={isRolling}
                  />
                  <span>Reuse Previous: {storedHPValue} HP (from level {preview.newLevel})</span>
                </label>
              </div>
            {/if}
          </div>
        </div>

        <!-- Resources Section -->
        <div class="section">
          <h3>Resources Restored</h3>
          <div class="resources">
            <div class="resource-item">
              <span class="resource-icon">✓</span>
              <span>All Spell Slots ({preview.spellSlotsRestored} total)</span>
            </div>
            <div class="resource-item">
              <span class="resource-icon">✓</span>
              <span>Hit Dice: {preview.newLevel}/{preview.newLevel}</span>
            </div>
            {#each Object.entries(preview.classFeatureCounts) as [name, { max }]}
              <div class="resource-item">
                <span class="resource-icon">✓</span>
                <span>{name}: {max === Infinity ? 'Unlimited' : `${max}/${max}`}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Proficiency Bonus -->
        <div class="section info">
          <p>
            <strong>Note:</strong> Proficiency Bonus and other abilities will be updated automatically.
          </p>
        </div>
      </div>

      <div class="modal-footer">
        {#if choiceError}<p class="choice-error" role="status">{choiceError}</p>{/if}
        <button class="btn btn-secondary" on:click={handleCancel}>Cancel</button>
        <button
          class="btn btn-primary"
          on:click={handleConfirm}
          disabled={!!choiceError || (hpGainMethod === 'roll' && hpRollValue === null)}
        >
          Confirm Level Up
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--card-bg);
    color: var(--text-color);
    border-radius: 12px;
    box-shadow: 0 18px 40px rgba(17, 31, 46, 0.28);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    max-height: 90dvh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 20px;
    background: linear-gradient(135deg, #2c5aa0 0%, #3d7bc4 100%);
    border-bottom: none;
  }

  .modal-header h2 {
    margin: 0;
    color: #fff;
    font-size: 1.5rem;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #fff;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .modal-body {
    padding: 20px;
    flex: 1;
  }

  .section {
    margin-bottom: 24px;
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .section h3 {
    margin-top: 0;
    margin-bottom: 12px;
    color: var(--primary-color);
    font-size: 1.1rem;
  }

  .section.info {
    background: var(--card-bg-secondary);
    border-left: 3px solid var(--primary-color);
    border-radius: 6px;
    padding: 12px;
  }

  .section.info p {
    margin: 0;
    font-size: 0.95rem;
  }

  .hp-preview {
    background: var(--card-bg-secondary);
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .hp-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 0.95rem;
  }

  .hp-row.highlight {
    background: var(--roll-result-background);
    color: var(--roll-result);
    margin: 0 -12px;
    padding: 8px 12px;
    font-weight: 700;
  }

  .hp-row .label {
    font-weight: 500;
  }

  .hp-row .value {
    font-weight: 700;
  }

  .hp-gain-selector {
    margin-bottom: 12px;
  }

  .radio-group {
    margin-bottom: 12px;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .radio-label input[type='radio'] {
    cursor: pointer;
  }

  .radio-label input[type='radio']:disabled {
    cursor: not-allowed;
  }

  .roll-controls {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 8px;
    padding-left: 24px;
  }

  .roll-btn {
    padding: 6px 12px;
    background: #e74c3c;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .roll-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .roll-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .roll-result {
    font-size: 0.9rem;
    font-weight: 500;
  }

  .resources {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .resource-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: var(--card-bg-secondary);
    border-left: 3px solid #2ecc71;
    border-radius: 4px;
    font-size: 0.95rem;
  }

  .resource-icon {
    color: #2ecc71;
    font-weight: 700;
    min-width: 20px;
    text-align: center;
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    padding: 16px 20px;
    border-top: 2px solid var(--border-color);
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .advancement-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .advancement-section input,
  .advancement-section select,
  .advancement-section textarea {
    box-sizing: border-box;
    width: 100%;
    padding: 8px;
    background: var(--card-bg-secondary);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .advancement-section input[type='checkbox'] {
    width: auto;
  }

  .ability-choices {
    display: grid;
    grid-template-columns: 1fr 64px;
    align-items: center;
    gap: 8px;
  }

  .choice-description {
    white-space: pre-wrap;
  }

  .choice-error {
    width: 100%;
    margin: 0;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
    color: #fff;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.85;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
  }

  .btn-secondary {
    background: var(--card-bg-secondary);
    color: var(--text-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--border-color);
  }
</style>
