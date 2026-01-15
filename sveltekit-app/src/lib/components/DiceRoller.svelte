<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { base } from '$app/paths';
  import { character } from '$lib/stores';
  import { getAvailableFeatures } from '$lib/classConfig';

  const dispatch = createEventDispatcher();

  export let notation = '';
  export let visible = false;
  export let damageNotation = ''; // Optional damage notation for attacks
  export let attackName = ''; // Optional attack name for context
  export let applyHalfDamage = false; // If true, halve the result after rolling
  export let bonusBreakdown: Array<{ value: number; source: string }> = []; // Breakdown of bonuses by source
  export let rollType: 'attack' | 'damage' | 'check' | 'save' | 'other' = 'other'; // Type of roll

  let diceBox: any = null;
  let diceContainer: HTMLDivElement | undefined = undefined;
  let isInitialized = false;
  let lastRolledNotation = '';
  let rollResult: any = null;

  // Export function to get last roll total
  export function getLastRollTotal(): number | null {
    return rollResult?.resultTotal ?? null;
  }

  // Break down roll results into discrete parts with their sources
  function breakdownRollResult(
    result: any,
    notation: string,
    breakdown: Array<{ value: number | string; source: string }>
  ): Array<{ display: string; source: string }> {
    const parts: Array<{ display: string; source: string }> = [];

    if (!result || !result.result) return parts;

    // Parse the notation to identify dice rolls
    // Example: "1d20+6+1d4" -> we need to identify the dice positions
    const notationParts = notation.match(/([+-]?\d*d\d+|[+-]?\d+)/g) || [];

    let resultIndex = 0; // Track position in result.result array
    const usedBreakdown = new Set<number>();

    for (const part of notationParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Check if this is a dice roll (e.g., "1d20", "2d6", "1d4")
      const diceMatch = trimmed.match(/([+-]?)(\d*)d(\d+)/);
      if (diceMatch) {
        const count = parseInt(diceMatch[2] || '1');

        // Check if this dice roll matches a string bonus from breakdown (like Bless's "1d4")
        const diceNotation = `${count}d${diceMatch[3]}`;
        const matchingIndex = breakdown.findIndex(
          (b, idx) =>
            !usedBreakdown.has(idx) && typeof b.value === 'string' && b.value === diceNotation
        );

        // Get the actual rolled values for this set of dice
        const diceValues: number[] = [];
        for (let i = 0; i < count && resultIndex < result.result.length; i++) {
          diceValues.push(result.result[resultIndex++]);
        }

        const source = matchingIndex >= 0 ? breakdown[matchingIndex].source : 'base die';
        if (matchingIndex >= 0) usedBreakdown.add(matchingIndex);

        // Show each die result separately
        for (const value of diceValues) {
          parts.push({
            display: `${value}`,
            source: source
          });
        }
      }
    }

    // Now add all numeric bonuses from the breakdown (not from parsing notation)
    // This ensures we show each bonus component separately (e.g., +5 attack, +1 magic weapon)
    for (let i = 0; i < breakdown.length; i++) {
      if (!usedBreakdown.has(i) && typeof breakdown[i].value === 'number') {
        const numValue = breakdown[i].value;
        parts.push({
          display: numValue >= 0 ? `+${numValue}` : `${numValue}`,
          source: breakdown[i].source
        });
      }
    }

    return parts;
  }

  // Custom dice selector
  let d4Count = 0;
  let d6Count = 0;
  let d8Count = 0;
  let d10Count = 0;
  let d12Count = 0;
  let d20Count = 0;
  let modifier = 0;

  // Follow-up actions for multi-step rolls
  let followUpActions: Array<{ label: string; notation: string }> = [];
  let isCriticalSuccess = false;
  let isCriticalFail = false;
  let guidedStrikeUsed = false;

  // Dice color customization
  let diceColor = '#051e0a';
  let labelColor = '#ffffff';
  let deskColor = '#3a2004';
  let showColorPicker = false;

  // Convert 8-char hex (with alpha) to 6-char hex for color input
  function stripAlpha(color: string): string {
    if (color.length === 9 && color.startsWith('#')) {
      return color.substring(0, 7);
    }
    return color;
  }

  // Add alpha channel back when updating colors
  function addAlpha(color: string, alpha: string = 'ff'): string {
    if (color.length === 7 && color.startsWith('#')) {
      return color + alpha;
    }
    return color;
  }

  // Check if character has Guided Strike and Channel Divinity uses
  $: hasGuidedStrike = (() => {
    if (!$character.class) return false;
    const features = getAvailableFeatures($character.class, $character.level, $character.subclass);
    return features.some((f) => f.name === 'Guided Strike');
  })();

  $: channelDivinityRemaining = (() => {
    const channelDivinityKey = 'ChannelDivinity';
    const current = $character.classFeatures.features[channelDivinityKey];
    return typeof current === 'number' ? current : 0;
  })();

  // Reactive notation that updates when any dice count changes
  $: currentNotation = (() => {
    const parts: string[] = [];
    if (d4Count > 0) parts.push(`${d4Count}d4`);
    if (d6Count > 0) parts.push(`${d6Count}d6`);
    if (d8Count > 0) parts.push(`${d8Count}d8`);
    if (d10Count > 0) parts.push(`${d10Count}d10`);
    if (d12Count > 0) parts.push(`${d12Count}d12`);
    if (d20Count > 0) parts.push(`${d20Count}d20`);

    let notation = parts.join('+') || '1d20';
    if (modifier !== 0) {
      notation += modifier >= 0 ? `+${modifier}` : `${modifier}`;
    }
    return notation;
  })();

  function initializeDiceBox() {
    if ((window as any).DICE && diceContainer) {
      try {
        // Clear existing canvas if any
        if (diceBox && diceContainer) {
          diceContainer.innerHTML = '';
        }

        // Get actual container dimensions
        const width = diceContainer.clientWidth || 500;
        const height = diceContainer.clientHeight || 300;

        diceBox = new (window as any).DICE.dice_box(diceContainer, {
          w: width,
          h: height
        });
        isInitialized = true;
        // console.log(`Dice box initialized with dimensions: ${width}x${height}`);
      } catch (e) {
        console.error('Error initializing dice box:', e);
      }
    }
  }

  onMount(() => {
    // Load dice libraries dynamically in sequence (dice.js depends on THREE and CANNON)
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          // console.log(`Script already loaded: ${src}`);
          resolve(null);
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
          // console.log(`Loaded: ${src}`);
          resolve(null);
        };
        script.onerror = () => {
          console.error(`Failed to load: ${src}`);
          reject(new Error(`Failed to load ${src}`));
        };
        document.head.appendChild(script);
      });
    };

    // Wait a bit for the container to be ready
    setTimeout(() => {
      // Load in sequence: THREE and CANNON first, then teal, then dice.js
      // Use base path for GitHub Pages deployment
      loadScript(`${base}/libs/three.min.js`)
        .then(() => loadScript(`${base}/libs/cannon.min.js`))
        .then(() => loadScript(`${base}/libs/teal.js`))
        .then(() => loadScript(`${base}/dice.js`))
        .then(() => {
          // console.log('All scripts loaded, initializing dice box...');
          // console.log('DICE available:', !!(window as any).DICE);
          // console.log('Container available:', !!diceContainer);

          // Load saved colors or use defaults
          if ((window as any).DICE) {
            const colors = (window as any).DICE.getColors();
            diceColor = stripAlpha(colors.dice_color);
            labelColor = stripAlpha(colors.label_color);
            deskColor = stripAlpha(colors.desk_color);
          }

          // Initialize dice box
          initializeDiceBox();
        })
        .catch((error) => {
          console.error('Failed to load dice libraries:', error);
        });
    }, 100);

    // Reinitialize on window resize
    const handleResize = () => {
      if (isInitialized) {
        // console.log('Window resized, reinitializing dice box...');
        initializeDiceBox();
      }
    };

    // Handle Escape key globally when modal is visible
    const handleEscape = (e: KeyboardEvent) => {
      if (visible && e.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleEscape);
    };
  });

  function rollDice(
    notation: string,
    type: 'attack' | 'damage' | 'check' | 'save' | 'other' = 'other'
  ) {
    if (!diceBox || !isInitialized) {
      return;
    }

    // console.log('Rolling dice:', notation, 'type:', type);

    // Clear previous roll result and state when starting a new roll
    rollResult = null;
    followUpActions = [];
    isCriticalSuccess = false;
    isCriticalFail = false;

    // Clear bonus breakdown when rolling damage (we don't want attack bonuses showing for damage rolls)
    if (type === 'damage') {
      bonusBreakdown = [];
    }

    rollType = type;
    guidedStrikeUsed = false; // Reset Guided Strike usage for new rolls

    // Set the dice notation before throwing
    diceBox.diceToRoll = notation;

    // before_roll callback - return null for random results
    const beforeRoll = (notationObj: any) => {
      // console.log('Before roll:', notationObj);
      return null; // Let dice roll randomly
    };

    // after_roll callback - handle the result
    const afterRoll = (notationObj: any) => {
      // console.log('After roll:', notationObj);
      let resultTotal = notationObj.resultTotal;
      let resultString = notationObj.resultString;
      // If applyHalfDamage is true, halve the result (rounded down)
      if (applyHalfDamage) {
        resultTotal = Math.floor(resultTotal / 2);
        resultString = resultString + ' (halved)';
      }
      rollResult = {
        ...notationObj,
        resultTotal,
        resultString
      };

      console.log('Final roll result:', rollResult);
      console.log({ type });

      // Detect critical hits/fails on d20 rolls (check first die roll)
      if (type === 'attack') {
        if (notationObj.result && notationObj.result.length > 0) {
          const firstDie = notationObj.result[0];
          isCriticalSuccess = firstDie === 20;
          isCriticalFail = firstDie === 1;

          // TODO: Play sounds for crit/fail
        }
      }

      // Set up follow-up actions based on roll type
      followUpActions = [];
      console.log(
        'Setting up follow-up actions. Type:',
        type,
        'damageNotation:',
        damageNotation,
        'isCriticalSuccess:',
        isCriticalSuccess,
        'isCriticalFail:',
        isCriticalFail
      );
      if (type === 'attack') {
        // If damage notation is provided, offer to roll damage
        if (damageNotation) {
          if (isCriticalSuccess) {
            // Double dice for critical hits (5e rules)
            const critDamage = doubleDiceNotation(damageNotation);
            // console.log('Creating critical damage button:', critDamage);
            followUpActions.push({
              label: `Roll Critical Damage (${critDamage})`,
              notation: critDamage
            });
          } else if (isCriticalFail) {
            // No damage on critical fail
            // console.log('No damage roll on critical fail');
          } else {
            // console.log('Creating normal damage button:', damageNotation);
            followUpActions.push({
              label: `Roll Damage (${damageNotation})`,
              notation: damageNotation
            });
          }
          // console.log('Follow-up actions after setup:', followUpActions);
        } else {
          // console.log('No damageNotation provided for attack roll');
        }
      }
      // console.log('Final followUpActions:', followUpActions);
    };

    diceBox.start_throw(beforeRoll, afterRoll);
  }

  function buildNotation(): string {
    const parts: string[] = [];
    if (d4Count > 0) parts.push(`${d4Count}d4`);
    if (d6Count > 0) parts.push(`${d6Count}d6`);
    if (d8Count > 0) parts.push(`${d8Count}d8`);
    if (d10Count > 0) parts.push(`${d10Count}d10`);
    if (d12Count > 0) parts.push(`${d12Count}d12`);
    if (d20Count > 0) parts.push(`${d20Count}d20`);

    let notation = parts.join('+') || '1d20';
    if (modifier !== 0) {
      notation += modifier >= 0 ? `+${modifier}` : `${modifier}`;
    }
    return notation;
  }

  function rollCustom() {
    const notation = buildNotation();
    rollDice(notation);
  }

  // Helper function to double dice for critical hits
  function doubleDiceNotation(notation: string): string {
    // Parse notation like "2d6+3" or "1d8+2d4+5"
    return notation.replace(/(\d+)d(\d+)/g, (match, count, sides) => {
      const doubledCount = parseInt(count) * 2;
      return `${doubledCount}d${sides}`;
    });
  }

  function resetDice() {
    d4Count = 0;
    d6Count = 0;
    d8Count = 0;
    d10Count = 0;
    d12Count = 0;
    d20Count = 0;
    modifier = 0;
    rollResult = null;
    followUpActions = [];
    isCriticalSuccess = false;
    isCriticalFail = false;
    rollType = 'other';
    guidedStrikeUsed = false;
  }

  function updateDiceColors() {
    if ((window as any).DICE) {
      // Update the global color vars with alpha channel
      (window as any).DICE.setColors({
        dice_color: addAlpha(diceColor, 'ff'),
        label_color: addAlpha(labelColor, 'ff'),
        desk_color: deskColor // desk color doesn't need alpha
      });

      // Update existing dice and desk in current dice box instance
      if (diceBox) {
        diceBox.updateDeskColor(deskColor);
        diceBox.updateDiceColors();
      }
    }
  }

  function toggleColorPicker() {
    showColorPicker = !showColorPicker;
  }

  function useGuidedStrike() {
    if (!rollResult || channelDivinityRemaining <= 0 || guidedStrikeUsed) return;

    // Add 10 to the result
    rollResult = {
      ...rollResult,
      resultTotal: rollResult.resultTotal + 10,
      resultString: rollResult.resultString + ' + 10 (Guided Strike)'
    };

    // Consume Channel Divinity
    character.update((c) => {
      const channelDivinityKey = 'ChannelDivinity';
      const current = c.classFeatures.features[channelDivinityKey];
      if (typeof current === 'number' && current > 0) {
        c.classFeatures.features[channelDivinityKey] = current - 1;
      }
      return c;
    });

    guidedStrikeUsed = true;
  }

  // Auto-roll when notation is set and modal is visible
  // Also track damageNotation and attackName to ensure they're set before rolling
  $: if (notation && isInitialized && visible && notation !== lastRolledNotation) {
    lastRolledNotation = notation;
    rollResult = null;
    followUpActions = [];
    isCriticalSuccess = false;
    isCriticalFail = false;
    guidedStrikeUsed = false;
    console.log(
      'Auto-roll triggered. notation:',
      notation,
      'damageNotation:',
      damageNotation,
      'attackName:',
      attackName,
      'rollType:',
      rollType
    );
    setTimeout(() => rollDice(notation, rollType), 200);
  }

  function close() {
    dispatch('close');
    // Reset state when closing (clear lastRolledNotation to force re-roll)
    notation = '';
    damageNotation = '';
    attackName = '';
    lastRolledNotation = '';
    rollResult = null;
    guidedStrikeUsed = false;
    isCriticalSuccess = false;
    isCriticalFail = false;
    resetDice();
  }
</script>

<div
  class="modal-overlay"
  class:hidden={!visible}
  on:click={close}
  on:keydown={(e) => e.key === 'Escape' && close()}
  role="button"
  tabindex="-1"
>
  <div class="modal-content" on:click|stopPropagation on:keydown role="dialog" tabindex="0">
    <div class="modal-header">
      <h2>Dice Roller</h2>
      <div class="header-buttons">
        <button class="color-btn" on:click={toggleColorPicker} title="Customize dice colors">
          🎨
        </button>
        <button class="close-btn" on:click={close}>×</button>
      </div>
    </div>

    {#if showColorPicker}
      <div class="color-picker-section">
        <h3>Dice Colors</h3>
        <div class="color-inputs">
          <div class="color-input-group">
            <label for="dice-color">Dice Color</label>
            <input
              type="color"
              id="dice-color"
              bind:value={diceColor}
              on:change={updateDiceColors}
            />
          </div>
          <div class="color-input-group">
            <label for="label-color">Label Color</label>
            <input
              type="color"
              id="label-color"
              bind:value={labelColor}
              on:change={updateDiceColors}
            />
          </div>
          <div class="color-input-group">
            <label for="desk-color">Background Color</label>
            <input
              type="color"
              id="desk-color"
              bind:value={deskColor}
              on:change={updateDiceColors}
            />
          </div>
        </div>
      </div>
    {/if}

    {#if !isInitialized}
      <div class="loading">
        <p>Loading 3D dice...</p>
      </div>
    {/if}

    <div class="dice-main-area">
      <div class="dice-container" bind:this={diceContainer}></div>

      {#if !notation}
        <!-- Custom dice selector when not auto-rolling -->
        <div class="custom-dice-selector">
          <h3>Choose Dice to Roll</h3>
          <div class="dice-inputs">
            <div class="dice-input-group">
              <label for="d4">d4</label>
              <input
                class="use-enabled"
                type="number"
                id="d4"
                bind:value={d4Count}
                min="0"
                max="10"
              />
            </div>
            <div class="dice-input-group">
              <label for="d6">d6</label>
              <input
                class="use-enabled"
                type="number"
                id="d6"
                bind:value={d6Count}
                min="0"
                max="10"
              />
            </div>
            <div class="dice-input-group">
              <label for="d8">d8</label>
              <input
                class="use-enabled"
                type="number"
                id="d8"
                bind:value={d8Count}
                min="0"
                max="10"
              />
            </div>
            <div class="dice-input-group">
              <label for="d10">d10</label>
              <input
                class="use-enabled"
                type="number"
                id="d10"
                bind:value={d10Count}
                min="0"
                max="10"
              />
            </div>
            <div class="dice-input-group">
              <label for="d12">d12</label>
              <input
                class="use-enabled"
                type="number"
                id="d12"
                bind:value={d12Count}
                min="0"
                max="10"
              />
            </div>
            <div class="dice-input-group">
              <label for="d20">d20</label>
              <input
                class="use-enabled"
                type="number"
                id="d20"
                bind:value={d20Count}
                min="0"
                max="10"
              />
            </div>
          </div>
          <div class="dice-controls">
            <button
              on:click={rollCustom}
              class="btn btn-primary use-enabled"
              disabled={!isInitialized}
            >
              Roll {currentNotation}
            </button>
            <button on:click={resetDice} class="btn btn-secondary use-enabled">Reset</button>
          </div>
        </div>
      {/if}
    </div>

    <div class="roll-result" class:has-result={rollResult}>
      {#if rollResult}
        <div class="result-header">
          <h3>{attackName ? `${attackName} - Result` : 'Result'}</h3>
          {#if isCriticalSuccess}
            <span class="crit-badge">CRITICAL HIT!</span>
          {/if}
          {#if isCriticalFail}
            <span class="crit-badge crit-fail">CRITICAL MISS!</span>
          {/if}
        </div>
        <div class="result-total">{rollResult.resultTotal}</div>
        <div class="result-details">
          <!-- {#if rollResult.resultString}
            <p>{rollResult.resultString}</p>
          {/if} -->
          {#if rollResult.constant || bonusBreakdown.length > 0}
            {#if bonusBreakdown.length > 0}
              <div class="bonus-breakdown">
                {#each breakdownRollResult(rollResult, notation, bonusBreakdown) as part}
                  <div class="bonus-item">
                    <span class="bonus-value">{part.display}</span>
                    <span class="bonus-source">({part.source})</span>
                  </div>
                {/each}
              </div>
            {:else if rollResult.constant}
              <p class="modifier-text">
                Modifier: {rollResult.constant >= 0 ? '+' : ''}{rollResult.constant}
              </p>
            {/if}
          {/if}
        </div>
        {#if isCriticalFail}
          <div>
            <em>No damage is dealt on a critical miss.</em>
          </div>
        {/if}
        {#if followUpActions.length > 0 || (hasGuidedStrike && rollType === 'attack' && !guidedStrikeUsed && channelDivinityRemaining > 0)}
          <div class="follow-up-actions">
            {#each followUpActions as action}
              <button
                class="btn btn-follow-up"
                on:click={() => rollDice(action.notation, 'damage')}
              >
                {action.label}
              </button>
            {/each}
            {#if hasGuidedStrike && rollType === 'attack' && !guidedStrikeUsed && channelDivinityRemaining > 0 && !isCriticalFail}
              <button
                class="btn btn-guided-strike"
                on:click={useGuidedStrike}
                disabled={channelDivinityRemaining <= 0}
                title={channelDivinityRemaining <= 0
                  ? 'No Channel Divinity uses remaining'
                  : 'Use Channel Divinity to add +10 to this attack roll'}
              >
                ⚡ Use Guided Strike (+10)
              </button>
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    visibility: visible;
    opacity: 1;
    transition:
      opacity 0.2s,
      visibility 0.2s;
  }

  .modal-overlay.hidden {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .modal-content {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    width: 900px;
    max-width: 95vw;
    height: 700px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .modal-header h2 {
    margin: 0;
    color: var(--primary-color);
  }

  .header-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .color-btn {
    width: 32px;
    height: 32px;
    background-color: #f0f0f0;
    border: 2px solid #ccc;
    border-radius: 6px;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .color-btn:hover {
    background-color: #e0e0e0;
    border-color: #999;
    transform: scale(1.05);
  }

  .close-btn {
    width: 32px;
    height: 32px;
    background-color: transparent;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #666;
    line-height: 1;
  }

  .close-btn:hover {
    color: #000;
  }

  .color-picker-section {
    background-color: #f9f9f9;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    border: 1px solid #e0e0e0;
  }

  .color-picker-section h3 {
    margin: 0 0 12px 0;
    font-size: 1rem;
    color: #333;
  }

  .color-inputs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }

  .color-input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .color-input-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #555;
  }

  .color-input-group input[type='color'] {
    width: 100%;
    height: 40px;
    border: 2px solid #ccc;
    border-radius: 6px;
    cursor: pointer;
    background: white;
    padding: 2px;
  }

  .color-input-group input[type='color']:hover {
    border-color: var(--primary-color);
  }

  .dice-main-area {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    min-height: 0;
  }

  .dice-container {
    width: 100%;
    height: 400px;
    background-color: #2a1810;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .dice-controls {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    font-size: 1.2rem;
    color: #666;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .custom-dice-selector {
    margin: 0;
    padding: 12px;
    background: #f9f9f9;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .custom-dice-selector h3 {
    margin: 0 0 8px 0;
    color: #8b0000;
    text-align: center;
    font-size: 1rem;
  }

  .dice-inputs {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 10px;
  }

  .dice-input-group {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .dice-input-group label {
    font-weight: bold;
    margin-bottom: 3px;
    color: #333;
    font-size: 0.9rem;
  }

  .dice-input-group input {
    width: 100%;
    max-width: 70px;
    padding: 5px;
    border: 2px solid #ccc;
    border-radius: 4px;
    text-align: center;
    font-size: 0.95rem;
  }

  .dice-input-group input:focus {
    outline: none;
    border-color: #8b0000;
  }

  .roll-result {
    margin-top: 8px;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    flex-shrink: 0;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: transparent;
    border: 3px solid transparent;
    transition: all 0.2s ease;
  }

  .roll-result.has-result {
    background: #e8f5e9;
    border-color: #4caf50;
  }

  .roll-result h3 {
    margin: 0 0 6px 0;
    color: #2e7d32;
    font-size: 1rem;
  }

  .result-total {
    font-size: 2.2rem;
    font-weight: bold;
    color: #1b5e20;
    margin: 6px 0;
    line-height: 1;
  }

  .result-details {
    margin-top: 8px;
    color: #333;
    font-size: 0.95rem;
  }

  .result-details p {
    margin: 3px 0;
  }

  .modifier-text {
    font-style: italic;
    color: #666;
    font-size: 0.9rem;
  }

  .bonus-breakdown {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .bonus-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 4px;
  }

  .bonus-value {
    font-size: 1.1rem;
    font-weight: bold;
    color: #2e7d32;
  }

  .bonus-source {
    font-size: 0.75rem;
    color: #666;
    font-style: italic;
  }

  .result-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  .crit-badge {
    background: linear-gradient(135deg, #ffd700, #ffed4e);
    color: #8b0000;
    padding: 4px 12px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 0.85rem;
    box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
    animation: pulse 0.5s ease-in-out;
  }
  .crit-badge.crit-fail {
    background: linear-gradient(135deg, #ff6666, #ffb347);
    color: #fff;
    box-shadow: 0 2px 8px rgba(255, 102, 102, 0.5);
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .follow-up-actions {
    margin-top: 12px;
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn-follow-up {
    background: linear-gradient(135deg, #2196f3, #1976d2);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);
  }

  .btn-follow-up:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(33, 150, 243, 0.4);
  }

  .btn-guided-strike {
    background: linear-gradient(135deg, #8b0000, #a50000);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(139, 0, 0, 0.3);
  }

  .btn-guided-strike:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(139, 0, 0, 0.4);
  }

  .btn-guided-strike:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #999;
  }

  /* Side-by-side layout for wider screens */
  @media (min-width: 769px) {
    .dice-main-area {
      flex-direction: row;
    }

    .dice-container {
      flex: 1;
      min-width: 0;
      margin-bottom: 0;
    }

    .custom-dice-selector {
      width: 280px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .dice-inputs {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .modal-content {
      width: 95vw;
      height: 90vh;
      padding: 15px;
    }

    .dice-container {
      width: 100%;
      height: 300px;
    }

    .dice-inputs {
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }

    .result-total {
      font-size: 1.8rem;
    }

    .custom-dice-selector {
      padding: 8px;
    }
  }
</style>
