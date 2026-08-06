<script lang="ts">
  import { rollHistory } from '$lib/stores';
  import SectionHeader from './SectionHeader.svelte';
  import { collapsedStates } from '$lib/stores';

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function clearHistory() {
    if (confirm('Clear all roll history?')) {
      rollHistory.clear();
    }
  }
</script>

<section class="roll-history-container">
  <SectionHeader
    title="Roll History"
    collapsed={$collapsedStates.rollHistory}
    onToggle={() =>
      collapsedStates.update((state) => ({ ...state, rollHistory: !state.rollHistory }))}
  />

  {#if !$collapsedStates.rollHistory}
    {#if $rollHistory.length === 0}
      <div class="empty-state">
        <p>No rolls yet. Roll some dice to see your history!</p>
      </div>
    {:else}
      <div class="history-controls">
        <button on:click={clearHistory} class="btn btn-secondary clear-btn"> Clear History </button>
      </div>
      <div class="history-list">
        {#each $rollHistory as entry (entry.id)}
          <div class="history-entry">
            <div class="entry-header">
              <span class="entry-purpose">{entry.purpose}</span>
              <span class="entry-time">{formatTimestamp(entry.timestamp)}</span>
            </div>
            <div class="entry-details">
              <span class="entry-notation">{entry.notation}</span>
              <span class="entry-result">= {entry.result}</span>
            </div>
            {#if entry.breakdown}
              <div class="entry-breakdown">{entry.breakdown}</div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .roll-history-container {
    background-color: var(--card-bg);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #666;
  }

  .history-controls {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 15px;
  }

  .clear-btn {
    padding: 6px 12px;
    font-size: 0.9rem;
  }

  .history-list {
    max-height: 400px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .history-entry {
    background-color: var(--light-bg);
    border-left: 3px solid var(--primary-color);
    padding: 12px;
    border-radius: 4px;
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .entry-purpose {
    font-weight: bold;
    color: var(--text-color);
    font-size: 0.95rem;
  }

  .entry-time {
    font-size: 0.8rem;
    color: #666;
  }

  .entry-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: monospace;
    font-size: 0.9rem;
  }

  .entry-notation {
    color: #555;
  }

  .entry-result {
    font-weight: bold;
    font-size: 1.1rem;
    color: var(--primary-color);
  }

  .entry-breakdown {
    margin-top: 6px;
    font-size: 0.85rem;
    color: #666;
    font-family: monospace;
  }
</style>
