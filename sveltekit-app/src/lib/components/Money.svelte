<script lang="ts">
  import { character, searchFilter, collapsedStates } from '$lib/stores';
  import SectionHeader from '$lib/components/SectionHeader.svelte';
  import type { Money } from '$lib/types';

  function toggleCollapse() {
    collapsedStates.update((s: any) => ({ ...s, money: !s.money }));
  }

  const CURRENCIES: { key: keyof Money; label: string; abbr: string; color: string }[] = [
    { key: 'pp', label: 'Platinum', abbr: 'PP', color: '#b0c4de' },
    { key: 'gp', label: 'Gold', abbr: 'GP', color: '#ffd700' },
    { key: 'ep', label: 'Electrum', abbr: 'EP', color: '#c0c0c0' },
    { key: 'sp', label: 'Silver', abbr: 'SP', color: '#d3d3d3' },
    { key: 'cp', label: 'Copper', abbr: 'CP', color: '#b87333' }
  ];

  function ensureMoney() {
    if (!$character.money) {
      character.update((c) => ({ ...c, money: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } }));
    }
  }

  function updateCurrency(key: keyof Money, value: string) {
    ensureMoney();
    const num = parseInt(value, 10);
    character.update((c) => ({
      ...c,
      money: { ...c.money!, [key]: isNaN(num) ? 0 : Math.max(0, num) }
    }));
  }

  function adjust(key: keyof Money, delta: number) {
    ensureMoney();
    character.update((c) => {
      const current = c.money?.[key] ?? 0;
      return {
        ...c,
        money: { ...c.money!, [key]: Math.max(0, current + delta) }
      };
    });
  }

  // GP equivalent for display
  $: totalGP =
    ($character.money?.pp ?? 0) * 10 +
    ($character.money?.gp ?? 0) +
    ($character.money?.ep ?? 0) * 0.5 +
    ($character.money?.sp ?? 0) * 0.1 +
    ($character.money?.cp ?? 0) * 0.01;

  $: hasVisibleContent =
    !$searchFilter ||
    'money'.includes($searchFilter.toLowerCase()) ||
    'gold'.includes($searchFilter.toLowerCase()) ||
    'currency'.includes($searchFilter.toLowerCase()) ||
    'coins'.includes($searchFilter.toLowerCase()) ||
    'platinum'.includes($searchFilter.toLowerCase()) ||
    'silver'.includes($searchFilter.toLowerCase()) ||
    'copper'.includes($searchFilter.toLowerCase());
</script>

<section class="money" class:hidden={!hasVisibleContent}>
  <SectionHeader
    title="Money"
    collapsed={$collapsedStates.money}
    ariaLabel={$collapsedStates.money ? 'Expand' : 'Collapse'}
    onToggle={toggleCollapse}
  />
  {#if !$collapsedStates.money}
    <div class="currency-grid">
      {#each CURRENCIES as { key, label, abbr, color }}
        <div class="currency-item">
          <div class="coin" style="background-color: {color};" title={label}>
            {abbr}
          </div>
          <div class="controls">
            <button class="adj-btn" on:click={() => adjust(key, -1)} aria-label="Remove {label}">−</button>
            <input
              type="number"
              min="0"
              value={$character.money?.[key] ?? 0}
              on:change={(e) => updateCurrency(key, (e.target as HTMLInputElement).value)}
              aria-label="{label} pieces"
            />
            <button class="adj-btn" on:click={() => adjust(key, 1)} aria-label="Add {label}">+</button>
          </div>
          <span class="currency-label">{label}</span>
        </div>
      {/each}
    </div>
    <div class="total-gp">
      Total value: <strong>{totalGP % 1 === 0 ? totalGP : totalGP.toFixed(2)} gp</strong>
    </div>
  {/if}
</section>

<style>
  .money {
    background-color: var(--card-bg);
    padding: 20px;
    border-radius: 8px;
    box-shadow: var(--shadow);
  }

  .currency-grid {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 16px;
    justify-content: center;
  }

  .currency-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-width: 80px;
  }

  .coin {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.75rem;
    color: #333;
    border: 2px solid rgba(0, 0, 0, 0.2);
    box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
    user-select: none;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .adj-btn {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    color: var(--text-color);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .adj-btn:hover {
    background: var(--primary-color);
    color: white;
  }

  input[type='number'] {
    width: 52px;
    text-align: center;
    padding: 2px 4px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--input-bg, var(--card-bg));
    color: var(--text-color);
    font-size: 0.95rem;
    -moz-appearance: textfield;
  }

  input[type='number']::-webkit-outer-spin-button,
  input[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .currency-label {
    font-size: 0.75rem;
    color: var(--secondary-color, #888);
  }

  .total-gp {
    margin-top: 14px;
    text-align: center;
    font-size: 0.9rem;
    color: var(--text-color);
    opacity: 0.8;
  }
</style>
