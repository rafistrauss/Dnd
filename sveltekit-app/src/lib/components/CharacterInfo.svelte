<script lang="ts">
  import { character, updateProficiencyBonus, collapsedStates } from '$lib/stores';
  import { getAvailableClasses, getAvailableSubclasses } from '$lib/classConfig';

  const classes = getAvailableClasses();

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
    character.update((c) => {
      c.level = parseInt(target.value) || 1;
      return c;
    });
    updateProficiencyBonus();
  }

  function toggleCollapse() {
    collapsedStates.update((s) => ({ ...s, characterInfo: !s.characterInfo }));
  }
</script>

<section class="character-info">
  <div class="header">
    <h2>Character Info</h2>
    <button
      class="collapse-btn"
      on:click={toggleCollapse}
      aria-label={$collapsedStates.characterInfo ? 'Expand' : 'Collapse'}
    >
      {$collapsedStates.characterInfo ? '▼' : '▲'}
    </button>
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
        <input
          type="number"
          id="characterLevel"
          value={$character.level}
          on:change={handleLevelChange}
          min="1"
          max="20"
        />
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

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 10px;
    margin-bottom: 15px;
  }

  h2 {
    margin: 0;
    color: var(--primary-color);
  }

  .collapse-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--primary-color);
    padding: 5px 10px;
    transition: transform 0.2s ease;
  }

  .collapse-btn:hover {
    transform: scale(1.1);
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
