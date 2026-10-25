<script lang="ts">
  import { turnTracker, collapsedStates, searchFilter, toasts } from '$lib/stores';
  import SectionHeader from '$lib/components/SectionHeader.svelte';

  function toggleCollapse() {
    collapsedStates.update((s: any) => ({ ...s, turnTracker: !s.turnTracker }));
  }

  type ActionKey = 'action' | 'bonusAction' | 'reaction';

  const actions: { key: ActionKey; label: string; hint: string }[] = [
    { key: 'action', label: 'Action', hint: 'Attack, Cast, Dash, etc.' },
    { key: 'bonusAction', label: 'Bonus Action', hint: 'Cunning Action, etc.' },
    { key: 'reaction', label: 'Reaction', hint: 'Uncanny Dodge, Opportunity Attack' }
  ];

  function toggle(key: ActionKey) {
    turnTracker.update((t) => ({ ...t, [key]: !t[key] }));
  }

  function nextTurn() {
    turnTracker.update((t) => ({
      round: t.round + 1,
      action: false,
      bonusAction: false,
      reaction: false
    }));
  }

  function endCombat() {
    turnTracker.set({ round: 1, action: false, bonusAction: false, reaction: false });
    toasts.add('Combat reset', 'info');
  }

  function adjustRound(delta: number) {
    turnTracker.update((t) => ({ ...t, round: Math.max(1, t.round + delta) }));
  }

  $: hasVisibleContent =
    !$searchFilter ||
    'turn'.includes($searchFilter.toLowerCase()) ||
    'round'.includes($searchFilter.toLowerCase()) ||
    'reaction'.includes($searchFilter.toLowerCase()) ||
    'action'.includes($searchFilter.toLowerCase()) ||
    'combat'.includes($searchFilter.toLowerCase());
</script>

<section class="turn-tracker" class:hidden={!hasVisibleContent}>
  <SectionHeader
    title="Turn Tracker"
    collapsed={$collapsedStates.turnTracker}
    ariaLabel={$collapsedStates.turnTracker ? 'Expand' : 'Collapse'}
    onToggle={toggleCollapse}
  />
  {#if !$collapsedStates.turnTracker}
    <div class="tracker-body">
      <div class="round-box">
        <button class="round-adj" on:click={() => adjustRound(-1)} aria-label="Previous round"
          >−</button
        >
        <div class="round-value">
          <span class="round-label">Round</span>
          <span class="round-number">{$turnTracker.round}</span>
        </div>
        <button class="round-adj" on:click={() => adjustRound(1)} aria-label="Next round">+</button>
      </div>

      <div class="actions">
        {#each actions as { key, label, hint }}
          <button
            class="action-chip"
            class:used={$turnTracker[key]}
            on:click={() => toggle(key)}
            title={hint}
          >
            <span class="chip-status">{$turnTracker[key] ? '✓ Used' : 'Available'}</span>
            <span class="chip-label">{label}</span>
          </button>
        {/each}
      </div>

      <div class="tracker-buttons">
        <button class="btn-next" on:click={nextTurn}>Next Turn ▶</button>
        <button class="btn-reset" on:click={endCombat}>Reset Combat</button>
      </div>
    </div>
  {/if}
</section>

<style>
  .turn-tracker {
    background-color: var(--card-bg);
    padding: 20px;
    border-radius: 8px;
    box-shadow: var(--shadow);
  }

  .hidden {
    display: none;
  }

  .tracker-body {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 16px;
    margin-top: 16px;
  }

  .round-box {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .round-adj {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    color: var(--text-color);
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .round-adj:hover {
    background: var(--primary-color);
    color: white;
  }

  .round-value {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 64px;
  }

  .round-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--secondary-color, #888);
  }

  .round-number {
    font-size: 1.8rem;
    font-weight: bold;
    color: var(--primary-color);
    line-height: 1;
  }

  .actions {
    display: flex;
    gap: 10px;
    flex: 1 1 auto;
    flex-wrap: wrap;
  }

  .action-chip {
    flex: 1 1 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 2px solid var(--border-color);
    background: var(--card-bg-secondary, var(--card-bg));
    color: var(--text-color);
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      opacity 0.15s ease;
  }

  .action-chip:hover {
    border-color: var(--primary-color);
  }

  .action-chip.used {
    background: rgba(200, 60, 60, 0.15);
    border-color: #c83c3c;
    opacity: 0.75;
  }

  .chip-label {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .chip-status {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--secondary-color, #888);
  }

  .action-chip.used .chip-status {
    color: #c83c3c;
    font-weight: 600;
  }

  .tracker-buttons {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .btn-next,
  .btn-reset {
    padding: 10px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .btn-next {
    background: var(--primary-color);
    color: white;
  }

  .btn-next:hover {
    filter: brightness(1.1);
  }

  .btn-reset {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-color);
  }

  .btn-reset:hover {
    background: var(--border-color);
  }
</style>
