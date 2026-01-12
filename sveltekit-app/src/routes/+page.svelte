<script lang="ts">
  import { onMount } from 'svelte';
  import {
    character,
    isEditMode,
    exportCharacter,
    importCharacter,
    searchFilter,
    toasts
  } from '$lib/stores';
  import { getClassConfig, getAvailableFeatures } from '$lib/classConfig';
  import CharacterInfo from '$lib/components/CharacterInfo.svelte';
  import AbilityScores from '$lib/components/AbilityScores.svelte';
  import CombatStats from '$lib/components/CombatStats.svelte';
  import Skills from '$lib/components/Skills.svelte';
  import Attacks from '$lib/components/Attacks.svelte';
  import ClassFeatures from '$lib/components/ClassFeatures.svelte';
  import Notes from '$lib/components/Notes.svelte';
  import DiceRoller from '$lib/components/DiceRoller.svelte';
  import GistModal from '$lib/components/GistModal.svelte';
  import WikidotImport from '$lib/components/WikidotImport.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import type { Character } from '$lib/types';

  function getAllSpellSlots(): { level: number; available: number; total: number }[] {
    const result: { level: number; available: number; total: number }[] = [];
    const spellSlots = $character.classFeatures.spellSlotsByLevel || {};

    for (let level = 1; level <= 9; level++) {
      const slots = spellSlots[level];
      if (slots && slots.length > 0) {
        const total = slots.length;
        const used = slots.filter((s) => s).length;
        result.push({ level, available: total - used, total });
      }
    }

    return result;
  }

  let showDiceRoller = false;
  let showGistModal = false;
  let showWikidotImport = false;
  let gistMode: 'save' | 'load' = 'save';
  let fileInput: HTMLInputElement | undefined = undefined;
  let diceNotation = '';
  let diceDamageNotation = '';
  let diceAttackName = '';
  let diceApplyHalfDamage = false;
  let diceBonusBreakdown: Array<{ value: number; source: string }> = [];
  let diceRollerComponent: any;
  let isHitDiceRoll = false;
  let showRestMenu = false;
  
    // Tooltip state for header effects
    let effectTooltipIdx: number | null = null;
    function showEffectTooltip(idx: number) {
      effectTooltipIdx = idx;
    }
    function hideEffectTooltip() {
      effectTooltipIdx = null;
    }
    function toggleEffectTooltip(idx: number) {
      effectTooltipIdx = effectTooltipIdx === idx ? null : idx;
    }

  function takeShortRest() {
    const restoredItems: string[] = [];

    character.update((c) => {
      // Restore hit dice (up to half of max)
      const hitDiceBefore = c.hitDice.current;
      c.hitDice.current = Math.min(
        c.hitDice.max,
        c.hitDice.current + Math.max(1, Math.floor(c.hitDice.max / 2))
      );
      const hitDiceRestored = c.hitDice.current - hitDiceBefore;
      if (hitDiceRestored > 0) {
        restoredItems.push(`${hitDiceRestored} hit ${hitDiceRestored === 1 ? 'die' : 'dice'}`);
      }

      // Reset features that recharge on short rest - check all available features
      if (c.class) {
        const availableFeatures = getAvailableFeatures(c.class, c.level, c.subclass);
        if (!c.classFeatures.features) {
          c.classFeatures.features = {};
        }

        availableFeatures.forEach((feature) => {
          if (feature.resetOn === 'short') {
            const featureKey = feature.name.replace(/\s+/g, '');

            if (feature.type === 'uses') {
              const maxUses =
                typeof feature.maxUses === 'function' ? feature.maxUses(c.level) : feature.maxUses;
              c.classFeatures.features[featureKey] = Array(maxUses).fill(false);
              restoredItems.push(feature.name);
            } else if (feature.type === 'pool') {
              const maxPool =
                typeof feature.maxPool === 'function' ? feature.maxPool(c.level) : feature.maxPool;
              if (maxPool !== undefined) {
                c.classFeatures.features[featureKey] = maxPool;
                restoredItems.push(feature.name);
              }
            }
          }
        });
      }

      return c;
    });

    showRestMenu = false;

    // Show toast with what was restored
    const message =
      restoredItems.length > 0
        ? `Short rest taken! Restored: ${restoredItems.join(', ')}`
        : 'Short rest taken!';
    toasts.add(message, 'success');
  }

  function takeLongRest() {
    const restoredItems: string[] = [];

    character.update((c) => {
      // Restore all HP
      const hpRestored = c.maxHP - c.currentHP;
      if (hpRestored > 0) {
        restoredItems.push(`${hpRestored} HP`);
      }
      c.currentHP = c.maxHP;
      c.tempHP = 0;

      // Restore all hit dice
      const hitDiceRestored = c.hitDice.max - c.hitDice.current;
      if (hitDiceRestored > 0) {
        restoredItems.push(`${hitDiceRestored} hit ${hitDiceRestored === 1 ? 'die' : 'dice'}`);
      }
      c.hitDice.current = c.hitDice.max;

      // Reset all spell slots
      let spellSlotsRestored = 0;
      if (c.classFeatures.spellSlotsByLevel) {
        Object.keys(c.classFeatures.spellSlotsByLevel).forEach((level) => {
          const slots = c.classFeatures.spellSlotsByLevel![parseInt(level)];
          if (slots) {
            const usedSlots = slots.filter((s) => s).length;
            spellSlotsRestored += usedSlots;
            c.classFeatures.spellSlotsByLevel![parseInt(level)] = Array(slots.length).fill(false);
          }
        });
      }
      if (spellSlotsRestored > 0) {
        restoredItems.push(
          `${spellSlotsRestored} spell ${spellSlotsRestored === 1 ? 'slot' : 'slots'}`
        );
      }

      // Reset all class features - iterate through available features, not just existing ones
      if (c.class) {
        const availableFeatures = getAvailableFeatures(c.class, c.level, c.subclass);
        if (!c.classFeatures.features) {
          c.classFeatures.features = {};
        }

        let featuresRestored = false;
        availableFeatures.forEach((feature) => {
          const featureKey = feature.name.replace(/\s+/g, '');

          // Skip info and channelDivinity types - they don't store state
          // 'info' features are passive, 'channelDivinity' features consume from the Channel Divinity pool
          if (feature.type === 'info' || feature.type === 'channelDivinity') {
            return;
          }

          if (feature.type === 'uses') {
            const maxUses =
              typeof feature.maxUses === 'function' ? feature.maxUses(c.level) : feature.maxUses;
            c.classFeatures.features[featureKey] = Array(maxUses).fill(false);
            featuresRestored = true;
          } else if (feature.type === 'pool') {
            const maxPool =
              typeof feature.maxPool === 'function' ? feature.maxPool(c.level) : feature.maxPool;
            if (maxPool !== undefined) {
              c.classFeatures.features[featureKey] = maxPool;
              featuresRestored = true;
            }
          }
        });

        if (featuresRestored) {
          restoredItems.push('all class features');
        }
      }

      return c;
    });

    showRestMenu = false;

    // Show toast with what was restored
    const message =
      restoredItems.length > 0
        ? `Long rest taken! Restored: ${restoredItems.join(', ')}`
        : 'Long rest taken! Fully rested.';
    toasts.add(message, 'success');
  }

  function getFeatureConfig(key: string) {
    // Import from classConfig to get feature definitions
    const classConfig = $character.class ? getClassConfig($character.class) : null;
    if (!classConfig) return null;

    const features = getAvailableFeatures($character.class, $character.level, $character.subclass);
    // The key is stored without spaces, so we need to match it
    return features.find((f) => f.name.replace(/\s+/g, '') === key);
  }

  function openDiceRoller(
    detail:
      | string
      | {
          notation: string;
          damageNotation?: string;
          attackName?: string;
          applyHalfDamage?: boolean;
          bonusBreakdown?: Array<{ value: number; source: string }>;
        }
  ) {
    // Reset notation first to ensure Svelte sees a change even if same value
    diceNotation = '';
    diceDamageNotation = '';
    diceAttackName = '';
    diceApplyHalfDamage = false;
    diceBonusBreakdown = [];
    isHitDiceRoll = false;

    // Set all values together to ensure they update simultaneously
    if (typeof detail === 'string') {
      diceNotation = detail;
    } else {
      diceNotation = detail.notation;
      diceDamageNotation = detail.damageNotation || '';
      diceAttackName = detail.attackName || '';
      diceApplyHalfDamage = !!detail.applyHalfDamage;
      diceBonusBreakdown = detail.bonusBreakdown || [];
    }
    showDiceRoller = true;
  }

  function handleHitDiceRoll(event: CustomEvent) {
    const { notation } = event.detail;
    diceNotation = '';
    isHitDiceRoll = true;

    setTimeout(() => {
      diceNotation = notation;
      diceDamageNotation = '';
      diceAttackName = 'Hit Die';
    }, 0);

    showDiceRoller = true;
  }

  function handleDiceRollerClose() {
    showDiceRoller = false;

    // If this was a hit dice roll, decrement the hit dice and add HP
    if (isHitDiceRoll && diceRollerComponent) {
      const rollTotal = diceRollerComponent.getLastRollTotal();

      if (rollTotal !== null) {
        const healing = Math.max(1, rollTotal);

        character.update((c: Character) => {
          c.hitDice.current = Math.max(0, c.hitDice.current - 1);
          c.currentHP = Math.min(c.maxHP, c.currentHP + healing);
          return c;
        });
      }

      isHitDiceRoll = false;
    }
  }

  function toggleMode() {
    isEditMode.update((v) => {
      return !v;
    });
  }

  // Close rest menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.rest-button-container')) {
      showRestMenu = false;
    }
  }

  // Apply use-mode class to body when mode changes
  onMount(() => {
    // console.log('onMount - initial isEditMode:', $isEditMode);
    // console.log('onMount - body classes:', document.body.className);

    const unsubscribe = isEditMode.subscribe((value) => {
      // console.log('isEditMode subscription triggered, value:', value);
      // console.log('Body classes before:', document.body.className);

      if (value) {
        document.body.classList.remove('use-mode');
        // console.log('Removed use-mode class (Edit Mode)');
      } else {
        document.body.classList.add('use-mode');
        // console.log('Added use-mode class (Use Mode)');
      }

      // console.log('Body classes after:', document.body.className);
    });

    // Add click listener for closing rest menu
    document.addEventListener('click', handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener('click', handleClickOutside);
    };
  });

  function handleExport() {
    exportCharacter($character);
  }

  function handleImport() {
    fileInput?.click();
  }

  async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const imported = await importCharacter(file);
      character.set(imported);
      alert('Character imported successfully!');
    } catch {
      alert('Failed to import character file');
    }
  }
</script>

<svelte:head>
  <title>D&D Character Sheet</title>
  <link rel="icon" type="image/png" href="favicon4.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="container">
  <header>
    <div class="header-top">
      <div class="header-title">
        <div class="title-row">
          <h1>D&D Character Sheet</h1>
          {#if $character.name}
            <span class="character-name">{$character.name} ({$character.level})</span>
          {/if}
        </div>
        {#if getAllSpellSlots().length > 0}
          <div class="spell-slots-header">
            {#each getAllSpellSlots() as slotInfo}
              <span class="slot-badge" class:depleted={slotInfo.available === 0}>
                Lv{slotInfo.level}: {slotInfo.available}/{slotInfo.total}
              </span>
            {/each}
          </div>
        {/if}
        {#if $character.activeStates && $character.activeStates.length > 0}
          <div class="active-effects-header">
            {#each $character.activeStates as state, index}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <span
                class="effect-badge"
                tabindex="0"
                aria-label={state.name}
                on:mouseenter={() => showEffectTooltip(index)}
                on:mouseleave={hideEffectTooltip}
                on:focus={() => showEffectTooltip(index)}
                on:blur={hideEffectTooltip}
                on:click={() => toggleEffectTooltip(index)}
              >
                ✨ {state.name}
                {#if effectTooltipIdx === index}
                  <span class="effect-tooltip">
                    <strong>{state.name}</strong><br />
                    {state.description}<br />
                    {#if state.attackBonus}
                      <span>Attack Bonus: {state.attackBonus > 0 ? '+' : ''}{state.attackBonus}</span><br />
                    {/if}
                    {#if state.damageBonus}
                      <span>Damage Bonus: {state.damageBonus > 0 ? '+' : ''}{state.damageBonus}</span>
                    {/if}
                  </span>
                {/if}
                {#if !$isEditMode}
                  <button
                    class="effect-remove-btn"
                    on:click={() => {
                      character.update((c) => {
                        if (c.activeStates) {
                          c.activeStates = c.activeStates.filter((_, i) => i !== index);
                        }
                        return c;
                      });
                    }}
                    title="End {state.name}">×</button
                  >
                {/if}
              </span>
            {/each}
          </div>
        <style>
          .effect-badge {
            position: relative;
          }
          .effect-tooltip {
            position: absolute;
            top: 120%;
            left: 50%;
            transform: translateX(-50%);
            background: #fff;
            color: #222;
            border: 1px solid #a5b4fc;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 0.95em;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            z-index: 10;
            min-width: 180px;
            max-width: 260px;
            white-space: normal;
            pointer-events: none;
            opacity: 1;
            transition: opacity 0.15s;
          }
        </style>
        {/if}
      </div>
      <div class="header-right">
        <div class="header-controls">
          <button on:click={() => (showDiceRoller = true)} class="btn btn-secondary use-enabled">
            <span class="btn-icon">🎲</span><span class="btn-text"> Roll Dice</span>
          </button>
          <div class="rest-button-container">
            <button
              on:click={() => (showRestMenu = !showRestMenu)}
              class="btn btn-secondary use-enabled"
            >
              <span class="btn-icon">😴</span><span class="btn-text"> Rest</span>
            </button>
            {#if showRestMenu}
              <div class="rest-menu">
                <button on:click={takeShortRest} class="rest-option">☕ Short Rest</button>
                <button on:click={takeLongRest} class="rest-option">🛏️ Long Rest</button>
              </div>
            {/if}
          </div>
          <div class="mode-toggle">
            <button on:click={toggleMode} class="btn btn-mode" class:use-mode={!$isEditMode}>
              <span class="btn-icon">{$isEditMode ? '📝' : '🎲'}</span><span class="btn-text">
                {$isEditMode ? 'Edit Mode' : 'Use Mode'}</span
              >
            </button>
          </div>
        </div>
        <div class="header-search">
          <input
            type="text"
            bind:value={$searchFilter}
            placeholder="🔍 Search..."
            class="search-input use-enabled"
          />
        </div>
      </div>
    </div>
    <div class="header-actions">
      <button on:click={() => (showWikidotImport = true)} class="btn btn-mode">
        📚 Browse Spells & Feats
      </button>
      <button
        on:click={() => {
          gistMode = 'save';
          showGistModal = true;
        }}
        class="btn btn-secondary"
      >
        Save to Gist
      </button>
      <button
        on:click={() => {
          gistMode = 'load';
          showGistModal = true;
        }}
        class="btn btn-secondary"
      >
        Load from Gist
      </button>
      <button on:click={handleExport} class="btn btn-secondary">Export JSON</button>
      <button on:click={handleImport} class="btn btn-secondary">Import JSON</button>
      <input
        type="file"
        bind:this={fileInput}
        on:change={handleFileChange}
        accept=".json"
        style="display: none;"
      />
    </div>
  </header>

  <main>
    <CharacterInfo />
    <CombatStats on:rollHitDice={handleHitDiceRoll} />
    <AbilityScores on:roll={(e) => openDiceRoller(e.detail)} />
    <Skills on:roll={(e) => openDiceRoller(e.detail)} />
    <Attacks on:roll={(e) => openDiceRoller(e.detail)} />
    <ClassFeatures />
    <Notes />
  </main>
</div>

<DiceRoller
  bind:this={diceRollerComponent}
  notation={diceNotation}
  damageNotation={diceDamageNotation}
  attackName={diceAttackName}
  applyHalfDamage={diceApplyHalfDamage}
  bonusBreakdown={diceBonusBreakdown}
  visible={showDiceRoller}
  on:close={handleDiceRollerClose}
/>

{#if showGistModal}
  <GistModal mode={gistMode} on:close={() => (showGistModal = false)} />
{/if}

{#if showWikidotImport}
  <WikidotImport onClose={() => (showWikidotImport = false)} />
{/if}

<Toast />

<style>
  :global(body) {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f5f5dc;
    color: #2c1810;
    line-height: 1.6;
    margin: 0;
    padding: 0;
    padding-top: 120px;
  }

  :global(:root) {
    --primary-color: #8b0000;
    --primary-color-hover: #a50000;
    --primary-color--disabled: rgb(90, 62, 62);
    --secondary-color: #c8a882;
    --bg-color: #f5f5dc;
    --card-bg: #ffffff;
    --text-color: #2c1810;
    --border-color: #8b7355;
    --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    --hover-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 10px;
  }

  header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background-color: var(--primary-color);
    color: white;
    padding: 15px 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .header-top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 10px;
  }

  .header-title {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .header-right {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .header-search {
    min-width: 200px;
    overflow-x: hidden;
  }

  h1 {
    font-size: 1.5rem;
    margin: 0;
  }

  .character-name {
    font-size: 1rem;
    font-weight: normal;
    opacity: 0.9;
    font-style: italic;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
  }

  .header-search {
    min-width: 200px;
  }

  .rest-button-container {
    position: relative;
  }

  .rest-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 5px;
    background: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    z-index: 1001;
    min-width: 150px;
  }

  .rest-option {
    display: block;
    width: 100%;
    padding: 10px 15px;
    border: none;
    background: white;
    text-align: left;
    cursor: pointer;
    color: var(--text-color);
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .rest-option:hover {
    background-color: var(--bg-color);
  }

  .search-input {
    width: 100%;
    min-width: 200px;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
  }

  .search-input:focus {
    outline: none;
    background-color: white;
    border-color: var(--secondary-color);
  }

  .spell-slots-header {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .slot-badge,
  .effect-badge {
    background-color: rgba(255, 255, 255, 0.95);
    color: #007bff;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 0.85rem;
    border: 1px solid rgba(179, 217, 255, 0.8);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .slot-badge.depleted {
    background-color: rgba(248, 215, 218, 0.95);
    color: #721c24;
    border: 1px solid rgba(245, 198, 203, 0.8);
  }

  .active-effects-header {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .effect-badge {
    color: #4a148c;
    padding: 5px 12px;
    /* border-radius: 16px; */
    font-weight: 600;
    font-size: 0.85rem;
    border: 1.5px solid rgba(156, 39, 176, 0.5);
    /* box-shadow: 0 2px 4px rgba(0,0,0,0.15); */
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .effect-remove-btn {
    background: rgba(211, 47, 47, 0.9);
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    padding: 0;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    margin-left: 4px;
    flex-shrink: 0;
  }

  .effect-remove-btn:hover {
    background: rgba(211, 47, 47, 1);
  }

  .header-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  :global(body.use-mode) .header-actions {
    display: none;
  }

  :global(.btn) {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  :global(.btn-primary) {
    background-color: var(--primary-color);
    color: white;
    border: 1px solid var(--primary-color);
  }

  :global(.btn-primary:disabled) {
    background-color: var(--primary-color--disabled);
    border-color: var(--primary-color--disabled);
    cursor: not-allowed;
    box-shadow: none;
  }

  :global(.btn-primary:hover:disabled) {
    background-color: var(--primary-color--disabled);
    border-color: var(--primary-color--disabled);
  }

  :global(.btn-primary:hover) {
    background-color: var(--primary-color-hover);
  }

  :global(.btn-secondary) {
    background-color: var(--secondary-color);
    color: var(--text-color);
  }

  :global(.btn-secondary:hover) {
    background-color: #b89872;
  }

  :global(.btn-success) {
    background-color: #28a745;
    color: white;
    border: 1px solid #28a745;
  }

  :global(.btn-success:hover) {
    background-color: #218838;
  }

  .btn-mode {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .btn-mode:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  main {
    margin-top: 80px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  :global(body.use-mode) main {
    margin-top: 40px;
  }

  @media (max-width: 768px) {
    h1 {
      display: none;
    }

    .character-name {
      font-size: 1.1rem;
      font-weight: bold;
      opacity: 1;
    }

    .header-top {
      gap: 8px;
    }

    .header-right {
      align-items: stretch;
    }

    .header-controls {
      flex-wrap: nowrap;
      gap: 6px;
    }

    .header-search {
      min-width: 150px;
    }

    .search-input {
      font-size: 0.85rem;
      padding: 6px 10px;
      min-width: 150px;
    }

    .btn-text {
      display: none;
    }

    .btn-icon {
      display: inline;
    }

    .spell-slots-header {
      gap: 4px;
    }

    .slot-badge {
      padding: 3px 8px;
      font-size: 0.75rem;
    }

    .header-actions {
      gap: 5px;
    }

    :global(.btn) {
      padding: 6px 12px;
      font-size: 0.85rem;
    }
  }
</style>
