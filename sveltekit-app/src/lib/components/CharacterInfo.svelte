<script lang="ts">
  import { character, setCharacterLevel, levelDownCharacter, collapsedStates, toasts } from '$lib/stores';
  import { getAvailableClasses, getAvailableSubclasses } from '$lib/classConfig';
  import SectionHeader from '$lib/components/SectionHeader.svelte';

  const classes = getAvailableClasses();

  export let onShowLevelUpModal: () => void = () => {};

  $: subclasses = $character.class ? getAvailableSubclasses($character.class) : [];

  function handleClassChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    character.update((c) => {
      c.class = target.value;
      c.subclass = ''; // Reset subclass when class changes
      return c;
    });
  }

  function handleSubclassChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    character.update((c) => {
      c.subclass = target.value;
      return c;
    });
  }

  function handleLevelChange(event: Event) {
    const target = event.target as HTMLInputElement;
    setCharacterLevel(parseInt(target.value) || 1);
  }

  function handleLevelUp() {
    onShowLevelUpModal();
  }

  function handleLevelDown() {
    levelDownCharacter();
    toasts.add(`Leveled down to ${$character.level}!`, 'info');
  }

  function toggleCollapse() {
    collapsedStates.update((s) => ({ ...s, characterInfo: !s.characterInfo }));
  }
</script>

<section class="character-info">
  <SectionHeader
    title="Character Info"
    collapsed={$collapsedStates.characterInfo}
    ariaLabel={$collapsedStates.characterInfo ? 'Expand' : 'Collapse'}
    onToggle={() => collapsedStates.update((s) => ({ ...s, characterInfo: !s.characterInfo }))}
  />
  <div class="header-hp-display" aria-label="Current hit points for testing">
    HP {$character.currentHP} / {$character.maxHP}
  </div>
  {#if !$collapsedStates.characterInfo}
    <div class="info-grid">
      <div class="form-group">
        <label for="characterName">Character Name</label>
        <input
          type="text"
          id="characterName"
          bind:value={$character.name}
          placeholder="Enter name"
        />
      </div>
      <div class="form-group">
        <label for="characterClass">Class</label>
        <select id="characterClass" value={$character.class} on:change={handleClassChange}>
          <option value="">Select Class</option>
          {#each classes as cls}
            <option value={cls.id}>{cls.name}</option>
          {/each}
        </select>
      </div>
      {#if subclasses.length > 0}
        <div class="form-group">
          <label for="characterSubclass">Subclass</label>
          <select
            id="characterSubclass"
            value={$character.subclass}
            on:change={handleSubclassChange}
          >
            <option value="">Select Subclass</option>
            {#each subclasses as subcls}
              <option value={subcls.id}>{subcls.name}</option>
            {/each}
          </select>
        </div>
      {/if}
      <div class="form-group">
        <label for="characterLevel">Level</label>
        <div class="level-controls">
          <input
            type="number"
            id="characterLevel"
            value={$character.level}
            on:change={handleLevelChange}
            min="1"
            max="20"
          />
          <button
            type="button"
            class="level-up-btn"
            on:click={handleLevelUp}
            disabled={!$character.class || $character.level >= 20}
          >
            Level Up
          </button>
                  <button
                    type="button"
                    class="level-down-btn"
                    on:click={handleLevelDown}
                    disabled={$character.level <= 1}
                  >
                    Level Down
                  </button>
        </div>
      </div>
      <div class="form-group">
        <label for="characterRace">Race</label>
        <input
          type="text"
          id="characterRace"
          bind:value={$character.race}
          placeholder="e.g., Human"
        />
      </div>
      <div class="form-group">
        <label for="characterBackground">Background</label>
        <input
          type="text"
          id="characterBackground"
          bind:value={$character.background}
          placeholder="e.g., Soldier"
        />
      </div>
      <div class="form-group">
        <label for="characterAlignment">Alignment</label>
        <input
          type="text"
          id="characterAlignment"
          bind:value={$character.alignment}
          placeholder="e.g., Lawful Good"
        />
      </div>
    </div>
  {/if}
</section>

<style>
  .character-info {
    background-color: var(--card-bg);
    padding: 20px;
    border-radius: 8px;
    box-shadow: var(--shadow);
  }

  .header-hp-display {
    margin-top: 10px;
    margin-bottom: 14px;
    display: inline-block;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 0.88rem;
    font-weight: 700;
    color: #1f3e65;
    background: #e8f1ff;
    border: 1px solid #c8dcf6;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .level-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .level-controls input {
    flex: 1;
  }

  .level-up-btn {
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    background: var(--primary-color);
    color: white;
    font-size: 0.95rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .level-down-btn {
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    background: #8b7355;
    color: white;
    font-size: 0.95rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .level-up-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .level-down-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  label {
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 0.9rem;
  }

  input,
  select {
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: var(--primary-color);
  }
</style>
