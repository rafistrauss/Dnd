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
  import {
    getSpellSaveDC,
    getACBreakdown,
    getInitiativeBreakdown,
    getSpellSaveDCBreakdown
  } from '$lib/combatUtils';
  import type { Character } from '$lib/types';
  import SectionHeader from '$lib/components/SectionHeader.svelte';

  const dispatch = createEventDispatcher();

  let hitDiceCount = 1;
  let showACTooltip = false;
  let showInitiativeTooltip = false;
  let showSpellSaveDCTooltip = false;

  function toggleTooltip(tooltip: 'ac' | 'initiative' | 'spellSaveDC') {
    if (tooltip === 'ac') {
      showACTooltip = !showACTooltip;
      showInitiativeTooltip = false;
      showSpellSaveDCTooltip = false;
    } else if (tooltip === 'initiative') {
      showInitiativeTooltip = !showInitiativeTooltip;
      showACTooltip = false;
      showSpellSaveDCTooltip = false;
    } else {
      showSpellSaveDCTooltip = !showSpellSaveDCTooltip;
      showACTooltip = false;
      showInitiativeTooltip = false;
    }
  }

  function adjustHP(amount: number) {
    character.update((c: Character) => {
      c.currentHP = Math.max(0, Math.min(c.maxHP, c.currentHP + amount));
      return c;
    });
  }

  function adjustHitDiceCount(amount: number) {
    const newCount = hitDiceCount + amount;
    const maxAllowed = $character.hitDice.current;
    // Clamp between 1 and available hit dice
    // Note: Input min is 1 even when 0 dice available; Roll button will be disabled
    hitDiceCount = Math.max(1, Math.min(maxAllowed, newCount));
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
    // Multiply modifier by number of dice (CON mod is added for each die rolled)
    const totalMod = conMod * actualCount;
    const modString = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;

    // Build the notation with constitution modifier for multiple dice
    const notation = `${actualCount}${hitDie}${modString}`;

    // Build bonus breakdown - show individual dice and CON modifier per die
    const bonusBreakdown: Array<{ value: number | string; source: string }> = [];

    // Add the hit dice to breakdown (will be extracted from roll result)
    bonusBreakdown.push({ value: `${actualCount}${hitDie}`, source: 'hit dice' });

    // Add CON modifier per die
    if (conMod !== 0) {
      for (let i = 0; i < actualCount; i++) {
        bonusBreakdown.push({ value: conMod, source: 'constitution' });
      }
    }

    // Dispatch event to open dice roller with a callback to handle the result
    dispatch('rollHitDice', { notation, hitDie, count: actualCount, bonusBreakdown });
  }

  function toggleCollapse() {
    collapsedStates.update((s: any) => ({ ...s, combatStats: !s.combatStats }));
  }

  // Calculate Spell Save DC: 8 + proficiency bonus + spellcasting ability modifier
  $: spellSaveDC = getSpellSaveDC($character, $abilityModifiers);

  // Generate tooltip breakdowns
  $: acTooltip = getACBreakdown($character, $abilityModifiers);
  $: initiativeTooltip = getInitiativeBreakdown($character, $abilityModifiers);
  $: spellSaveDCTooltip = getSpellSaveDCBreakdown($character, $abilityModifiers);

  // Ensure hitDiceCount doesn't exceed available hit dice
  // Note: When 0 dice available, hitDiceCount stays at 1 (HTML input min), but Roll button is disabled
  $: {
    const maxAvailable = $character.hitDice.current;
    if (maxAvailable > 0 && hitDiceCount > maxAvailable) {
      hitDiceCount = maxAvailable;
    }
  }

  // Calculate total AC bonus from active states
  $: totalAcBonus =
    $character.activeStates && $character.activeStates.length > 0
      ? $character.activeStates.reduce((sum, s) => sum + (s.acBonus || 0), 0)
      : 0;

  // Check if Aid effect is active and targeting self
  $: hasAidEffect =
    $character.activeStates && $character.activeStates.length > 0
      ? $character.activeStates.some((s) => s.name === 'Aid' && s.target === 'self')
      : false;

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
        <div class="stat-label-with-icon">
          <label for="armorClass">Armor Class</label>
          <button
            class="info-icon"
            on:click={() => toggleTooltip('ac')}
            aria-label="Show AC breakdown"
            type="button"
          >
            ℹ️
          </button>
        </div>
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
          />
        {/if}
        {#if showACTooltip}
          <div class="tooltip-popup">
            {#if totalAcBonus !== 0}
              <div>{acTooltip}</div>
              <div style="margin-top: 5px;">Active Effects: +{totalAcBonus}</div>
            {:else}
              <div>{acTooltip}</div>
            {/if}
          </div>
        {/if}
      </div>
      <div class="stat-box">
        <div class="stat-label-with-icon">
          <label for="initiative">Initiative</label>
          <button
            class="info-icon"
            on:click={() => toggleTooltip('initiative')}
            aria-label="Show Initiative breakdown"
            type="button"
          >
            ℹ️
          </button>
        </div>
        <input
          type="number"
          id="initiative"
          bind:value={$character.initiative}
          class="stat-input"
        />
        {#if showInitiativeTooltip}
          <div class="tooltip-popup">
            {initiativeTooltip}
          </div>
        {/if}
      </div>
      <div class="stat-box">
        <label for="speed">Speed</label>
        <input type="text" id="speed" bind:value={$character.speed} class="stat-input" />
      </div>
      {#if spellSaveDC !== null}
        <div class="stat-box">
          <div class="stat-label-with-icon">
            <label for="spellSaveDC">Spell Save DC</label>
            <button
              class="info-icon"
              on:click={() => toggleTooltip('spellSaveDC')}
              aria-label="Show Spell Save DC breakdown"
              type="button"
            >
              ℹ️
            </button>
          </div>
          <input type="number" id="spellSaveDC" value={spellSaveDC} class="stat-input" readonly />
          {#if showSpellSaveDCTooltip}
            <div class="tooltip-popup">
              {spellSaveDCTooltip}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="hp-section">
      <h3>Hit Points</h3>
      <div class="hp-display" class:aid-active={hasAidEffect}>
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
        <div class="hit-dice-count-controls">
          <button
            class="hit-dice-btn"
            on:click={() => adjustHitDiceCount(-1)}
            disabled={hitDiceCount <= 1}
          >
            −
          </button>
          <input
            type="number"
            id="hitDiceCount"
            class="hit-dice-count-input"
            min="1"
            max={$character.hitDice.current}
            bind:value={hitDiceCount}
            on:input={(e) => {
              const input = e.target as HTMLInputElement;
              const val = parseInt(input.value);
              if (val > $character.hitDice.current) hitDiceCount = $character.hitDice.current;
              if (val < 1) hitDiceCount = 1;
            }}
          />
          <button
            class="hit-dice-btn"
            on:click={() => adjustHitDiceCount(1)}
            disabled={hitDiceCount >= $character.hitDice.current}
          >
            +
          </button>
        </div>
        <button
          class="btn btn-primary roll-hit-dice use-enabled"
          on:click={() => rollHitDice(hitDiceCount)}
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
    position: relative;
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
    padding: 10px;
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .hp-display.aid-active {
    background: linear-gradient(135deg, #fff9e6 0%, #ffe6cc 100%);
    border: 2px solid #ffb347;
    box-shadow: 0 0 15px rgba(255, 179, 71, 0.3);
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

  .hit-dice-controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .hit-dice-count-controls {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .hit-dice-count-input {
    width: 60px;
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    text-align: center;
    font-size: 1rem;
  }

  .hit-dice-btn {
    padding: 6px 12px;
    background-color: var(--secondary-color);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 1rem;
    transition: background-color 0.2s;
    min-width: 35px;
  }

  .hit-dice-btn:hover:not(:disabled) {
    background-color: #b89872;
  }

  .hit-dice-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .stat-label-with-icon {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 5px;
  }

  .info-icon {
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    opacity: 0.7;
    transition:
      opacity 0.2s,
      transform 0.2s;
  }

  .info-icon:hover {
    opacity: 1;
    transform: scale(1.1);
  }

  .tooltip-popup {
    position: absolute;
    background: #333;
    color: white;
    padding: 10px;
    border-radius: 6px;
    font-size: 0.85rem;
    line-height: 1.5;
    white-space: pre-line;
    z-index: 1000;
    margin-top: 5px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 250px;
    animation: fadeIn 0.2s ease-in;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
