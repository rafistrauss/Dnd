<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { character, toasts } from '$lib/stores';
  import { calculateDamage, applyDamage } from '$lib/combatUtils';
  import SectionHeader from '$lib/components/SectionHeader.svelte';
  import { collapsedStates, searchFilter } from '$lib/stores';

  const dispatch = createEventDispatcher();

  let damageAmount = 0;
  let damageType = '';
  let showCalculation = false;
  let calculatedDamage = 0;
  let adjustmentMessages: string[] = [];

  // Common damage types for quick selection
  const commonDamageTypes = [
    'slashing',
    'piercing',
    'bludgeoning',
    'fire',
    'cold',
    'lightning',
    'thunder',
    'acid',
    'poison',
    'necrotic',
    'radiant',
    'psychic',
    'force'
  ];

  function calculateDamageWithAdjustments() {
    if (damageAmount <= 0) {
      toasts.add('Please enter a damage amount greater than 0', 'error');
      return;
    }

    if (!damageType.trim()) {
      toasts.add('Please enter or select a damage type', 'error');
      return;
    }

    const result = calculateDamage(damageAmount, damageType, $character);
    calculatedDamage = result.finalDamage;
    adjustmentMessages = result.adjustments;
    showCalculation = true;
  }

  function applyCalculatedDamage() {
    character.update((c) => applyDamage(c, calculatedDamage));

    toasts.add(`Applied ${calculatedDamage} damage to character (${damageType})`, 'info');

    // Reset form
    damageAmount = 0;
    damageType = '';
    showCalculation = false;
    calculatedDamage = 0;
    adjustmentMessages = [];
  }

  function cancel() {
    showCalculation = false;
    calculatedDamage = 0;
    adjustmentMessages = [];
  }

  $: hasVisibleContent =
    !$searchFilter ||
    'damage'.includes($searchFilter.toLowerCase()) ||
    'resistance'.includes($searchFilter.toLowerCase()) ||
    'immune'.includes($searchFilter.toLowerCase());
</script>

<section class="damage-input" class:hidden={!hasVisibleContent}>
  <SectionHeader
    title="Apply Damage"
    collapsed={$collapsedStates.damageInput}
    ariaLabel={$collapsedStates.damageInput ? 'Expand' : 'Collapse'}
    onToggle={() => collapsedStates.update((s) => ({ ...s, damageInput: !s.damageInput }))}
  />

  {#if !$collapsedStates.damageInput}
    <div class="damage-form">
      <div class="input-group">
        <div class="input-field">
          <label for="damageAmount">Damage Amount</label>
          <input
            type="number"
            id="damageAmount"
            bind:value={damageAmount}
            min="0"
            placeholder="0"
            class="damage-input-field"
          />
        </div>

        <div class="input-field">
          <label for="damageType">Damage Type</label>
          <input
            type="text"
            id="damageType"
            bind:value={damageType}
            list="damageTypes"
            placeholder="e.g., fire, cold"
            class="damage-input-field"
          />
          <datalist id="damageTypes">
            {#each commonDamageTypes as type}
              <option value={type}></option>
            {/each}
          </datalist>
        </div>
      </div>

      <div class="quick-types">
        <span class="quick-types-label">Quick Select:</span>
        {#each commonDamageTypes.slice(0, 6) as type}
          <button
            class="quick-type-btn"
            on:click={() => (damageType = type)}
            class:active={damageType === type}
          >
            {type}
          </button>
        {/each}
      </div>

      {#if !showCalculation}
        <button class="btn btn-primary calculate-btn" on:click={calculateDamageWithAdjustments}>
          Calculate Damage
        </button>
      {:else}
        <div class="calculation-result">
          <div class="result-header">
            <h4>Damage Calculation</h4>
          </div>
          <div class="result-content">
            <div class="damage-breakdown">
              <div class="damage-row">
                <span class="label">Original Damage:</span>
                <span class="value">{damageAmount} {damageType}</span>
              </div>
              <div class="adjustments">
                {#each adjustmentMessages as msg}
                  <div class="adjustment-msg">{msg}</div>
                {/each}
              </div>
              <div class="damage-row final">
                <span class="label">Final Damage:</span>
                <span class="value damage-value">{calculatedDamage}</span>
              </div>
            </div>
          </div>
          <div class="result-actions">
            <button class="btn btn-primary apply-btn" on:click={applyCalculatedDamage}>
              Apply Damage
            </button>
            <button class="btn btn-secondary cancel-btn" on:click={cancel}> Cancel </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .damage-input {
    background-color: var(--card-bg);
    padding: 20px;
    border-radius: 8px;
    box-shadow: var(--shadow);
  }

  .hidden {
    display: none;
  }

  .damage-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .input-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .input-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  label {
    font-weight: bold;
    font-size: 0.9rem;
    color: var(--text-color);
  }

  .damage-input-field {
    padding: 10px;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  .damage-input-field:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .quick-types {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .quick-types-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #666;
  }

  .quick-type-btn {
    padding: 6px 12px;
    background-color: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }

  .quick-type-btn:hover {
    background-color: #e0e0e0;
    border-color: #999;
  }

  .quick-type-btn.active {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  .calculate-btn,
  .apply-btn {
    padding: 12px 20px;
    font-size: 1rem;
    font-weight: bold;
  }

  .calculation-result {
    background-color: #f9f9f9;
    border: 2px solid var(--border-color);
    border-radius: 6px;
    padding: 15px;
  }

  .result-header h4 {
    margin: 0 0 10px 0;
    color: var(--primary-color);
    font-size: 1.1rem;
  }

  .result-content {
    margin-bottom: 15px;
  }

  .damage-breakdown {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .damage-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background-color: white;
    border-radius: 4px;
  }

  .damage-row.final {
    background-color: #fff9e6;
    border: 2px solid #ffb347;
    font-weight: bold;
  }

  .damage-row .label {
    color: #555;
  }

  .damage-row .value {
    color: var(--text-color);
  }

  .damage-value {
    font-size: 1.2rem;
    color: #d32f2f;
  }

  .adjustments {
    padding: 8px;
    background-color: #e3f2fd;
    border-radius: 4px;
    border-left: 4px solid #2196f3;
  }

  .adjustment-msg {
    font-size: 0.9rem;
    color: #1565c0;
    padding: 4px 0;
  }

  .result-actions {
    display: flex;
    gap: 10px;
  }

  .apply-btn,
  .cancel-btn {
    flex: 1;
    padding: 10px;
    font-weight: bold;
  }

  .btn {
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: var(--primary-color);
    color: white;
  }

  .btn-primary:hover {
    background-color: #8b0000;
  }

  .btn-secondary {
    background-color: #999;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #777;
  }

  @media (max-width: 600px) {
    .input-group {
      grid-template-columns: 1fr;
    }

    .quick-types {
      flex-direction: column;
      align-items: flex-start;
    }

    .result-actions {
      flex-direction: column;
    }
  }
</style>
