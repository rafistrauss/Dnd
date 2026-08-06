<script lang="ts">
  import { toasts } from '$lib/stores';
  import { fly } from 'svelte/transition';
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}" transition:fly={{ y: -50, duration: 300 }}>
      <span class="toast-icon">
        {#if toast.type === 'success'}✓{/if}
        {#if toast.type === 'error'}✕{/if}
        {#if toast.type === 'info'}ℹ{/if}
      </span>
      <span class="toast-message">{toast.message}</span>
      <button
        class="toast-close"
        on:click={() => toasts.remove(toast.id)}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 300px;
    max-width: 500px;
    pointer-events: auto;
    font-size: 0.95rem;
  }

  .toast-success {
    background: #10b981;
    color: white;
  }

  .toast-error {
    background: #ef4444;
    color: white;
  }

  .toast-info {
    background: #3b82f6;
    color: white;
  }

  .toast-icon {
    font-size: 1.2rem;
    font-weight: bold;
    flex-shrink: 0;
  }

  .toast-message {
    flex: 1;
    word-break: break-word;
  }

  .toast-close {
    background: transparent;
    border: none;
    color: inherit;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    transition: opacity 0.2s;
    flex-shrink: 0;
  }

  .toast-close:hover {
    opacity: 1;
  }
</style>
