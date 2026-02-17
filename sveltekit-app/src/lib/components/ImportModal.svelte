<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { importCharacter } from '$lib/stores';
  import { character } from '$lib/stores';

  const dispatch = createEventDispatcher();

  let jsonText = '';
  let error = '';
  let fileInputRef: HTMLInputElement;

  function handleClose() {
    dispatch('close');
  }

  function handleFileClick() {
    fileInputRef?.click();
  }

  async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const imported = await importCharacter(file);
      character.set(imported);
      dispatch('close');
      alert('Character imported successfully!');
    } catch (e) {
      error = 'Failed to import character file. Please ensure the JSON is valid.';
    }
    // Reset file input
    target.value = '';
  }

  async function handleImportJson() {
    if (!jsonText.trim()) {
      error = 'Please paste JSON data or select a file.';
      return;
    }

    try {
      const imported = JSON.parse(jsonText);
      // Use the same validation/merging logic as importCharacter
      const merged = {
        ...imported,
        attacks: imported.attacks?.map((attack: any) => ({
          ...attack,
          id: attack.id || crypto.randomUUID()
        })) || [],
        classFeatures: imported.classFeatures || {
          features: {},
          spellSlots: [],
          spellSlotsByLevel: {},
          preparedSpells: ''
        },
        racialTraits: imported.racialTraits || { uses: {} }
      };
      
      character.set(merged);
      dispatch('close');
      alert('Character imported successfully!');
    } catch (e) {
      error = 'Error importing character. Please ensure the JSON is valid.';
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
</script>

<div class="modal" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && handleClose()} role="dialog" aria-modal="true" aria-labelledby="importModalTitle">
  <div class="modal-content">
    <button class="close" on:click={handleClose}>&times;</button>
    <h3 id="importModalTitle">Import Character JSON</h3>
    <p>
      Paste your character JSON data below or
      <button class="link-button" on:click={handleFileClick}>select a file</button>:
    </p>

    <textarea
      bind:value={jsonText}
      placeholder="Paste JSON here..."
      rows="15"
      class="json-textarea"
      aria-label="Character JSON data"
    />

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <div class="modal-actions">
      <button class="btn btn-primary" on:click={handleImportJson}>Import</button>
      <button class="btn btn-secondary" on:click={handleClose}>Cancel</button>
    </div>

    <!-- Hidden file input -->
    <input
      type="file"
      bind:this={fileInputRef}
      on:change={handleFileChange}
      accept=".json"
      style="display: none;"
    />
  </div>
</div>

<style>
  .modal {
    display: block;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background-color: var(--card-bg, #fff);
    margin: 5% auto;
    padding: 20px;
    border: 3px solid var(--border-color, #8b0000);
    border-radius: 8px;
    width: 90%;
    max-width: 700px;
    animation: slideDown 0.3s ease;
    position: relative;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .close {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    line-height: 20px;
  }

  .close:hover,
  .close:focus {
    color: var(--primary-color, #8b0000);
  }

  h3 {
    margin-top: 0;
    color: var(--primary-color, #8b0000);
  }

  p {
    margin-bottom: 15px;
  }

  .link-button {
    background: none;
    border: none;
    color: var(--primary-color, #8b0000);
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
  }

  .link-button:hover {
    color: var(--primary-hover, #a00);
  }

  .json-textarea {
    width: 100%;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    padding: 10px;
    border: 2px solid var(--border-color, #ccc);
    border-radius: 4px;
    background-color: var(--card-bg, #fff);
    color: var(--text-color, #000);
    resize: vertical;
    min-height: 300px;
    box-sizing: border-box;
  }

  .json-textarea:focus {
    outline: none;
    border-color: var(--primary-color, #8b0000);
  }

  .error-message {
    color: #d32f2f;
    margin: 10px 0;
    padding: 10px;
    background-color: #ffebee;
    border-radius: 4px;
    border: 1px solid #ef5350;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 15px;
  }

  .modal-actions .btn {
    flex: 1;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.3s ease;
  }

  .btn-primary {
    background-color: var(--primary-color, #8b0000);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--primary-hover, #a00);
  }

  .btn-secondary {
    background-color: #666;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #777;
  }
</style>
