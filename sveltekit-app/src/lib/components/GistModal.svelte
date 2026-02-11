<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { character, toasts } from '$lib/stores';
  import {
    saveToGist,
    updateGist,
    loadFromGist,
    loadGistConfig,
    saveGistConfig,
    listUserGists,
    type GistInfo
  } from '$lib/gistUtils';

  const dispatch = createEventDispatcher();

  export let mode: 'save' | 'load' = 'save';

  let token = '';
  let gistId = '';
  let description = '';
  let loading = false;
  let error = '';
  let useManualEntry = false;
  let loadingGists = false;
  let gists: GistInfo[] = [];
  let selectedGist: GistInfo | null = null;

  const config = loadGistConfig();
  if (config.token) token = config.token;
  if (config.gistId) gistId = config.gistId;

  onMount(async () => {
    if (token && !useManualEntry) {
      await fetchGists();
    }
  });

  async function fetchGists() {
    if (!token) return;

    loadingGists = true;
    error = '';
    try {
      gists = await listUserGists(token);
      // Pre-select the configured gist if it exists in the list
      if (gistId) {
        selectedGist = gists.find((g) => g.id === gistId) || null;
      }
    } catch (e: any) {
      error = e.message || 'Failed to load gists';
      gists = [];
    } finally {
      loadingGists = false;
    }
  }

  function selectGist(gist: GistInfo) {
    if (selectedGist?.id === gist.id) {
      selectedGist = null;
      gistId = '';
    } else {
      selectedGist = gist;
      gistId = gist.id;
    }
  }

  function toggleEntryMode() {
    useManualEntry = !useManualEntry;
    error = '';
    if (!useManualEntry && token) {
      fetchGists();
    }
  }

  async function handleSave() {
    if (!token) {
      error = 'GitHub token is required';
      return;
    }

    // Use the selected gist ID if available
    const targetGistId = selectedGist?.id || gistId;

    loading = true;
    error = '';

    try {
      if (targetGistId) {
        await updateGist($character, token, targetGistId);
        gistId = targetGistId;
        toasts.add('Character updated in Gist successfully!', 'success');
      } else {
        const newGistId = await saveToGist($character, token, description);
        gistId = newGistId;
        toasts.add(`Character saved to Gist! ID: ${newGistId}`, 'success');
      }

      saveGistConfig({ token, gistId });
      dispatch('close');
    } catch (e: any) {
      error = e.message || 'Failed to save to Gist';
    } finally {
      loading = false;
    }
  }

  async function handleLoad() {
    // Use the selected gist ID if available, otherwise use manually entered ID
    const targetGistId = selectedGist?.id || gistId;

    if (!targetGistId) {
      error = 'Please select a gist or enter a Gist ID';
      return;
    }

    loading = true;
    error = '';

    try {
      const loaded = await loadFromGist(targetGistId, token || undefined);
      character.set(loaded);
      gistId = targetGistId;

      saveGistConfig({ token, gistId });
      toasts.add('Character loaded from Gist successfully!', 'success');
      dispatch('close');
    } catch (e: any) {
      error = e.message || 'Failed to load from Gist';
    } finally {
      loading = false;
    }
  }

  function close() {
    dispatch('close');
  }
</script>

<div
  class="modal-overlay"
  on:click={close}
  on:keydown={(e) => e.key === 'Escape' && close()}
  role="button"
  tabindex="-1"
>
  <div class="modal-content" on:click|stopPropagation on:keydown role="dialog" tabindex="0">
    <div class="modal-header">
      <h2>{mode === 'save' ? 'Save to GitHub Gist' : 'Load from GitHub Gist'}</h2>
      <button class="close-btn" on:click={close}>×</button>
    </div>

    <div class="modal-body">
      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <div class="form-group">
        <label for="token">
          GitHub Token {mode === 'load' ? '(optional for public gists)' : '(required)'}
          <a href="https://github.com/settings/tokens" target="_blank" rel="noopener">Get token</a>
        </label>
        <input
          type="password"
          id="token"
          bind:value={token}
          placeholder="ghp_xxxxxxxxxxxxx"
          disabled={loading}
          on:blur={() => {
            if (token && !useManualEntry) {
              fetchGists();
            }
          }}
        />
      </div>

      {#if mode === 'load' || (mode === 'save' && token)}
        <div class="toggle-container">
          <button type="button" class="toggle-btn" on:click={toggleEntryMode} disabled={loading}>
            {useManualEntry ? '📋 Show My Gists' : '✏️ Enter Gist ID Manually'}
          </button>
        </div>
      {/if}

      {#if mode === 'save'}
        {#if useManualEntry || !token}
          <div class="form-group">
            <label for="gistId">Gist ID (leave empty to create new)</label>
            <input
              type="text"
              id="gistId"
              bind:value={gistId}
              placeholder="Optional: existing Gist ID to update"
              disabled={loading}
            />
          </div>
        {:else if loadingGists}
          <div class="loading-message">Loading your gists...</div>
        {:else if gists.length > 0}
          <div class="form-group">
            <div class="gist-list-label">
              Select a Gist to Update (or leave unselected to create new)
            </div>
            <div class="gist-list">
              {#each gists as gist}
                <button
                  type="button"
                  class="gist-item"
                  class:selected={selectedGist?.id === gist.id}
                  on:click={() => selectGist(gist)}
                  disabled={loading}
                >
                  <div class="gist-item-header">
                    <span class="gist-description">{gist.description || 'Untitled'}</span>
                    <span class="gist-visibility">{gist.public ? '🌐 Public' : '🔒 Private'}</span>
                  </div>
                  <div class="gist-item-meta">
                    <span class="gist-id">ID: {gist.id}</span>
                    <span class="gist-date"
                      >Updated: {new Date(gist.updated_at).toLocaleDateString()}</span
                    >
                  </div>
                </button>
              {/each}
            </div>
          </div>
        {:else if token}
          <div class="info-message">No gists found. A new one will be created.</div>
        {/if}

        <div class="form-group">
          <label for="description">Description {gistId ? '(optional)' : ''}</label>
          <input
            type="text"
            id="description"
            bind:value={description}
            placeholder="D&D Character Sheet"
            disabled={loading}
          />
        </div>
      {:else if useManualEntry || !token}
        <div class="form-group">
          <label for="gistId">Gist ID *</label>
          <input
            type="text"
            id="gistId"
            bind:value={gistId}
            placeholder="Enter Gist ID (for public or your private gists)"
            disabled={loading}
            required
          />
        </div>
      {:else if loadingGists}
        <div class="loading-message">Loading your gists...</div>
      {:else if gists.length > 0}
        <div class="form-group">
          <div class="gist-list-label">Select a Gist to Load</div>
          <div class="gist-list">
            {#each gists as gist}
              <button
                type="button"
                class="gist-item"
                class:selected={selectedGist?.id === gist.id}
                on:click={() => selectGist(gist)}
                disabled={loading}
              >
                <div class="gist-item-header">
                  <span class="gist-description">{gist.description || 'Untitled'}</span>
                  <span class="gist-visibility">{gist.public ? '🌐 Public' : '🔒 Private'}</span>
                </div>
                <div class="gist-item-meta">
                  <span class="gist-id">ID: {gist.id}</span>
                  <span class="gist-date"
                    >Updated: {new Date(gist.updated_at).toLocaleDateString()}</span
                  >
                </div>
              </button>
            {/each}
          </div>
        </div>
      {:else if token}
        <div class="info-message">
          No gists found. Enter a Gist ID manually or create a new one in Save mode.
        </div>
      {/if}

      <div class="modal-actions">
        <button
          on:click={mode === 'save' ? handleSave : handleLoad}
          class="btn btn-primary"
          disabled={loading}
        >
          {#if loading}
            {mode === 'save' ? 'Saving...' : 'Loading...'}
          {:else}
            {mode === 'save' ? 'Save' : 'Load'}
          {/if}
        </button>
        <button on:click={close} class="btn btn-secondary" disabled={loading}>Cancel</button>
      </div>
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
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    max-width: 500px;
    width: 90vw;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #ccc;
  }

  .modal-header h2 {
    margin: 0;
    color: #8b0000;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #666;
    line-height: 1;
  }

  .close-btn:hover {
    color: #000;
  }

  .modal-body {
    padding: 20px;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    font-weight: bold;
    margin-bottom: 5px;
  }

  .form-group label a {
    font-weight: normal;
    font-size: 0.9rem;
    margin-left: 10px;
  }

  .form-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: #8b0000;
  }

  .form-group input:disabled {
    background: #f0f0f0;
    cursor: not-allowed;
  }

  .error-message {
    background: #fee;
    color: #c00;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    border: 1px solid #fcc;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-container {
    margin-bottom: 15px;
    text-align: center;
  }

  .toggle-btn {
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .toggle-btn:hover:not(:disabled) {
    background: #e0e0e0;
    border-color: #999;
  }

  .toggle-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading-message {
    text-align: center;
    padding: 20px;
    color: #666;
    font-style: italic;
  }

  .info-message {
    background: #e3f2fd;
    color: #1565c0;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    border: 1px solid #90caf9;
    text-align: center;
  }

  .gist-list-label {
    font-weight: bold;
    margin-bottom: 8px;
    color: #333;
  }

  .gist-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    background: #fafafa;
  }

  .gist-item {
    width: 100%;
    text-align: left;
    background: white;
    border: 2px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .gist-item:last-child {
    margin-bottom: 0;
  }

  .gist-item:hover:not(:disabled) {
    border-color: #8b0000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .gist-item.selected {
    border-color: #8b0000;
    background: #fff5f5;
    box-shadow: 0 2px 4px rgba(139, 0, 0, 0.2);
  }

  .gist-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .gist-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .gist-description {
    font-weight: bold;
    color: #333;
    flex: 1;
    margin-right: 10px;
  }

  .gist-visibility {
    font-size: 0.85rem;
    color: #666;
    white-space: nowrap;
  }

  .gist-item-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #666;
  }

  .gist-id {
    font-family: monospace;
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .gist-date {
    font-style: italic;
  }
</style>
