<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    character,
    searchFilter,
    collapsedStates,
    abilityModifiers,
    isEditMode
  } from '$lib/stores';
  import { getClassConfig } from '$lib/classConfig';
  import { getSpellSaveDC } from '$lib/combatUtils';
  import type { Character } from '$lib/types';
  import SectionHeader from '$lib/components/SectionHeader.svelte';

  const dispatch = createEventDispatcher();

  function adjustHP(amount: number) {
    character.update((c: Character) => {
      c.currentHP = Math.max(0, Math.min(c.maxHP, c.currentHP + amount));
      return c;
    });
  }

  function rollHitDice(count: number = 1) {
    if ($character.hitDice.current <= 0) {
      alert('No hit dice remaining!');
      return;
    }

    if (!$character.class) {
      alert('Please select a class first!');
      return;
    }

    const classConfig = getClassConfig($character.class);
    if (!classConfig) {
      alert('Invalid class configuration!');
      return;
    }

    // Clamp count to available dice
    const actualCount = Math.min(count, $character.hitDice.current);

    // Get the hit die notation (e.g., 'd10')
    const hitDie = classConfig.hitDice;
    const conMod = $abilityModifiers.constitution;
    const modString = conMod >= 0 ? `+${conMod}` : `${conMod}`;

    // Build the notation with constitution modifier for multiple dice
    const notation = `${actualCount}${hitDie}${modString}`;

    // Dispatch event to open dice roller with a callback to handle the result
    dispatch('rollHitDice', { notation, hitDie, count: actualCount });
  }

  function toggleCollapse() {
    collapsedStates.update((s: any) => ({ ...s, combatStats: !s.combatStats }));
  }

  // Calculate Spell Save DC: 8 + proficiency bonus + spellcasting ability modifier
  $: spellSaveDC = getSpellSaveDC($character, $abilityModifiers);

  // Calculate total AC bonus from active states
  $: totalAcBonus =
    $character.activeStates && $character.activeStates.length > 0
      ? $character.activeStates.reduce((sum, s) => sum + (s.acBonus || 0), 0)
      : 0;

  $: hasVisibleContent =
    !$searchFilter ||
    'armor class'.includes($searchFilter.toLowerCase()) ||
    'initiative'.includes($searchFilter.toLowerCase()) ||
    'speed'.includes($searchFilter.toLowerCase()) ||
    'hit points'.includes($searchFilter.toLowerCase()) ||
    'hp'.includes($searchFilter.toLowerCase()) ||
    'hit dice'.includes($searchFilter.toLowerCase()) ||
    'spell save'.includes($searchFilter.toLowerCase()) ||
    'combat'.includes($searchFilter.toLowerCase());
</script>

<section class="combat-stats" class:hidden={!hasVisibleContent}>
  <SectionHeader
    title="Combat Stats"
    collapsed={$collapsedStates.combatStats}
    ariaLabel={$collapsedStates.combatStats ? 'Expand' : 'Collapse'}
    onToggle={() => collapsedStates.update((s) => ({ ...s, combatStats: !s.combatStats }))}
  />
  {#if !$collapsedStates.combatStats}
    <div class="stats-grid">
      <div class="stat-box">
        <label for="armorClass">Armor Class</label>
        {#if $isEditMode}
          <input
            type="number"
            id="armorClass"
            bind:value={$character.armorClass}
            class="stat-input"
          />
        {:else}
          <input
            type="text"
            id="armorClass"
            value={totalAcBonus !== 0
              ? `${$character.armorClass} → ${$character.armorClass + totalAcBonus}`
              : `${$character.armorClass}`}
            class={totalAcBonus !== 0 ? 'stat-input ac-enhanced' : 'stat-input'}
            readonly
            title={totalAcBonus !== 0 ? 'Base AC plus active effect bonuses' : 'Base Armor Class'}
          />
        {/if}
      </div>
      <div class="stat-box">
        <label for="initiative">Initiative</label>
        <input
          type="number"
          id="initiative"
          bind:value={$character.initiative}
          class="stat-input"
        />
      </div>
      <div class="stat-box">
        <label for="speed">Speed</label>
        <input type="text" id="speed" bind:value={$character.speed} class="stat-input" />
      </div>
      {#if spellSaveDC !== null}
        <div class="stat-box">
          <label for="spellSaveDC">Spell Save DC</label>
          <input
            type="number"
            id="spellSaveDC"
            value={spellSaveDC}
            class="stat-input"
            readonly
            title="8 + Proficiency Bonus + Spellcasting Ability Modifier"
          />
        </div>
      {/if}
    </div>

    <div class="hp-section">
      <h3>Hit Points</h3>
      <div class="hp-display">
        <div class="hp-inputs">
          <input
            type="number"
            bind:value={$character.currentHP}
            class="hp-current"
            min="0"
            max={$character.maxHP}
          />
          <span class="hp-separator">/</span>
          <input type="number" bind:value={$character.maxHP} class="hp-max" min="0" />
        </div>
        <div class="hp-controls">
          <button class="hp-btn" on:click={() => adjustHP(-1)}>−</button>
          <button class="hp-btn" on:click={() => adjustHP(1)}>+</button>
          <button class="hp-btn" on:click={() => adjustHP(-5)}>−5</button>
          <button class="hp-btn" on:click={() => adjustHP(5)}>+5</button>
        </div>
      </div>
      <div class="temp-hp">
        <label for="tempHP">Temp HP</label>
        <input type="number" id="tempHP" bind:value={$character.tempHP} min="0" />
      </div>
    </div>

    <div class="hit-dice-section">
      <h3>Hit Dice</h3>
      <div class="hit-dice-display">
        <input
          type="number"
          bind:value={$character.hitDice.current}
          class="hit-dice-input"
          min="0"
          max={$character.hitDice.max}
        />
        <span>/</span>
        <input type="number" bind:value={$character.hitDice.max} class="hit-dice-input" min="0" />
        {#if $character.class}
          {@const classConfig = getClassConfig($character.class)}
          {#if classConfig}
            {@const conMod = $abilityModifiers.constitution}
            <span class="hit-dice-type"
              >({classConfig.hitDice}{conMod >= 0 ? `+${conMod}` : conMod})</span
            >
          {/if}
        {/if}
      </div>
      <div class="hit-dice-controls">
        <label for="hitDiceCount">Roll</label>
        <input
          type="number"
          id="hitDiceCount"
          class="hit-dice-count-input"
          min="1"
          max={$character.hitDice.current}
          value="1"
          on:input={(e) => {
            const input = e.target as HTMLInputElement;
            const val = parseInt(input.value);
            if (val > $character.hitDice.current) input.value = String($character.hitDice.current);
            if (val < 1) input.value = '1';
          }}
        />
        <button
          class="btn btn-primary roll-hit-dice use-enabled"
          on:click={() => {
            const countInput = document.getElementById('hitDiceCount') as HTMLInputElement;
            const count = parseInt(countInput?.value || '1');
            rollHitDice(count);
          }}
          disabled={$character.hitDice.current <= 0 || !$character.class}
        >
          🎲 Roll
        </button>
      </div>
    </div>
  {/if}
</section>

<style>
  .combat-stats {
    background-color: var(--card-bg);
    padding: 20px;
    border-radius: 8px;
    box-shadow: var(--shadow);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 10px;
    margin-bottom: 15px;
  }

  h2 {
    margin: 0;
    color: var(--primary-color);
  }

  .collapse-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--primary-color);
    padding: 5px 10px;
    transition: transform 0.2s ease;
  }

  .collapse-btn:hover {
    transform: scale(1.1);
  }

  .hidden {
    display: none;
  }

  h3 {
    margin-top: 0;
    margin-bottom: 10px;
    color: var(--text-color);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
  }

  .stat-box {
    display: flex;
    flex-direction: column;
  }

  label {
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 0.9rem;
  }

  .stat-input {
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
    text-align: center;
  }

  .hp-section {
    background-color: #f9f9f9;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 15px;
  }

  .hp-display {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .hp-inputs {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .hp-current,
  .hp-max {
    padding: 10px;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    font-size: 1.2rem;
    font-weight: bold;
    text-align: center;
    width: 70px;
  }

  .hp-current {
    border-color: var(--primary-color);
  }

  .hp-separator {
    font-size: 1.5rem;
    font-weight: bold;
  }

  .hp-controls {
    display: flex;
    gap: 5px;
  }

  .hp-btn {
    padding: 8px 12px;
    background-color: var(--secondary-color);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
  }

  .hp-btn:hover {
    background-color: #b89872;
  }

  .temp-hp {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .temp-hp input {
    width: 80px;
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .hit-dice-section {
    background-color: #f9f9f9;
    padding: 15px;
    border-radius: 6px;
  }

  .hit-dice-display {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 10px;
  }

  .hit-dice-input {
    width: 60px;
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    text-align: center;
  }

  .roll-hit-dice {
    width: 100%;
    margin-top: 5px;
  }

  .roll-hit-dice:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .ac-enhanced {
    color: #007bff;
    font-weight: bold;
    background: #e9f5ff;
    border: 2px solid #b3e0ff;
  }
</style>
