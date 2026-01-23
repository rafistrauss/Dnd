<script lang="ts">
  import type { Attack } from '$lib/types';

  export let show = false;
  export let attacks: Attack[] = [];
  export let onSave: (reorderedAttacks: Attack[]) => void;
  export let onCancel: () => void;

  let localAttacks: Attack[] = [];

  $: if (show) {
    localAttacks = [...attacks];
  }

  function swapElements(index1: number, index2: number) {
    const temp = localAttacks[index1];
    localAttacks[index1] = localAttacks[index2];
    localAttacks[index2] = temp;
    localAttacks = [...localAttacks]; // Trigger reactivity
  }

  function moveUp(index: number) {
    if (index > 0) {
      swapElements(index, index - 1);
    }
  }

  function moveDown(index: number) {
    if (index < localAttacks.length - 1) {
      swapElements(index, index + 1);
    }
  }

  function handleSave() {
    onSave(localAttacks);
  }

  function handleCancel() {
    onCancel();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
</script>

{#if show}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="presentation">
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h3 id="modal-title">Reorder Attacks & Spells</h3>
        <button class="btn-close" on:click={handleCancel} aria-label="Close">×</button>
      </div>

      <div class="modal-body">
        {#if localAttacks.length === 0}
          <p class="empty-message">No attacks or spells to reorder.</p>
        {:else}
          <ul class="reorder-list">
            {#each localAttacks as attack, index (attack.id)}
              <li class="reorder-item">
                <span class="attack-name">{attack.name || '(Unnamed attack or spell)'}</span>
                <div class="reorder-buttons">
                  <button
                    class="btn-move"
                    on:click={() => moveUp(index)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    class="btn-move"
                    on:click={() => moveDown(index)}
                    disabled={index === localAttacks.length - 1}
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={handleCancel}>Cancel</button>
        <button class="btn btn-primary" on:click={handleSave}>Save Order</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--card-background, #2a2a2a);
    border: 1px solid var(--border-color, #444);
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color, #444);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-color, #f0f0f0);
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    color: var(--text-color, #f0f0f0);
    cursor: pointer;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .btn-close:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .empty-message {
    text-align: center;
    color: var(--text-muted, #999);
    margin: 2rem 0;
  }

  .reorder-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .reorder-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    margin-bottom: 0.5rem;
    background-color: var(--input-background, #1a1a1a);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
  }

  .attack-name {
    flex: 1;
    font-size: 1rem;
    color: var(--text-color, #f0f0f0);
  }

  .reorder-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn-move {
    background-color: var(--button-secondary-bg, #444);
    border: 1px solid var(--border-color, #666);
    color: var(--text-color, #f0f0f0);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 1rem;
    line-height: 1;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-move:hover:not(:disabled) {
    background-color: var(--button-secondary-hover, #555);
  }

  .btn-move:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .modal-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--border-color, #444);
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .btn-primary {
    background-color: var(--primary-color, #0066cc);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--primary-color-hover, #0052a3);
  }

  .btn-secondary {
    background-color: var(--button-secondary-bg, #444);
    color: var(--text-color, #f0f0f0);
  }

  .btn-secondary:hover {
    background-color: var(--button-secondary-hover, #555);
  }
</style>
