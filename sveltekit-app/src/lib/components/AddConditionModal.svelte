<script lang="ts">
  import type { SpellState, ConditionAbility } from '$lib/types';

  export let show = false;
  export let onSave: (condition: SpellState) => void;
  export let onCancel: () => void;

  let conditionName = '';
  let description = '';
  let attackBonus: number | string = 0;
  let damageBonus: number | string = 0;
  let acBonus = 0;
  let darkvision = 0;
  let resistances: string[] = [];
  let resistanceInput = '';
  let abilities: ConditionAbility[] = [];
  let newAbilityName = '';
  let newAbilityDescription = '';
  let newAbilityUses = 0;
  let newAbilityRestType: 'short' | 'long' = 'short';
  let newAbilityRequiresReaction = false;

  function resetForm() {
    conditionName = '';
    description = '';
    attackBonus = 0;
    damageBonus = 0;
    acBonus = 0;
    darkvision = 0;
    resistances = [];
    resistanceInput = '';
    abilities = [];
    newAbilityName = '';
    newAbilityDescription = '';
    newAbilityUses = 0;
    newAbilityRestType = 'short';
    newAbilityRequiresReaction = false;
  }

  function addResistance() {
    if (resistanceInput.trim()) {
      resistances = [...resistances, resistanceInput.trim()];
      resistanceInput = '';
    }
  }

  function removeResistance(index: number) {
    resistances = resistances.filter((_, i) => i !== index);
  }

  function addAbility() {
    if (newAbilityName.trim() && newAbilityDescription.trim()) {
      const ability: ConditionAbility = {
        name: newAbilityName.trim(),
        description: newAbilityDescription.trim(),
        requiresReaction: newAbilityRequiresReaction
      };

      if (newAbilityUses > 0) {
        ability.usesPerRest = newAbilityUses;
        ability.currentUses = newAbilityUses;
        ability.restType = newAbilityRestType;
      }

      abilities = [...abilities, ability];
      newAbilityName = '';
      newAbilityDescription = '';
      newAbilityUses = 0;
      newAbilityRestType = 'short';
      newAbilityRequiresReaction = false;
    }
  }

  function removeAbility(index: number) {
    abilities = abilities.filter((_, i) => i !== index);
  }

  function handleSave() {
    if (!conditionName.trim()) {
      alert('Please enter a condition name');
      return;
    }

    const condition: SpellState = {
      name: conditionName.trim(),
      description: description.trim() || 'Custom condition',
      attackBonus: attackBonus || 0,
      damageBonus: damageBonus || 0,
      target: 'self'
    };

    if (acBonus !== 0) condition.acBonus = acBonus;
    if (darkvision > 0) condition.darkvision = darkvision;
    if (resistances.length > 0) condition.resistances = resistances;
    if (abilities.length > 0) condition.abilities = abilities;

    onSave(condition);
    resetForm();
  }

  function handleCancel() {
    resetForm();
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
        <h3 id="modal-title">Add Custom Condition</h3>
        <button class="btn-close" on:click={handleCancel} aria-label="Close">×</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="conditionName">Condition Name*</label>
          <input
            type="text"
            id="conditionName"
            bind:value={conditionName}
            placeholder="e.g., Cazna's Mark"
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            bind:value={description}
            placeholder="Describe the condition..."
            rows="3"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="attackBonus">Attack Bonus</label>
            <input type="text" id="attackBonus" bind:value={attackBonus} placeholder="0 or 1d4" />
          </div>

          <div class="form-group">
            <label for="damageBonus">Damage Bonus</label>
            <input type="text" id="damageBonus" bind:value={damageBonus} placeholder="0 or 1d6" />
          </div>

          <div class="form-group">
            <label for="acBonus">AC Bonus</label>
            <input type="number" id="acBonus" bind:value={acBonus} placeholder="0" />
          </div>
        </div>

        <div class="form-group">
          <label for="darkvision">Darkvision (feet)</label>
          <input
            type="number"
            id="darkvision"
            bind:value={darkvision}
            placeholder="0"
            min="0"
            step="30"
          />
          <small class="help-text">Grant or extend darkvision (e.g., 60 for 60 feet)</small>
        </div>

        <div class="form-group">
          <label>Damage Resistances</label>
          <div class="resistance-input-group">
            <input
              type="text"
              bind:value={resistanceInput}
              placeholder="e.g., cold, fire, poison"
              on:keydown={(e) => e.key === 'Enter' && addResistance()}
            />
            <button type="button" class="btn-add" on:click={addResistance}>Add</button>
          </div>
          {#if resistances.length > 0}
            <div class="resistance-list">
              {#each resistances as resistance, index}
                <span class="resistance-tag">
                  {resistance}
                  <button
                    type="button"
                    class="tag-remove"
                    on:click={() => removeResistance(index)}
                    aria-label="Remove {resistance}">×</button
                  >
                </span>
              {/each}
            </div>
          {/if}
        </div>

        <div class="form-group">
          <label>Special Abilities</label>
          <div class="ability-form">
            <input
              type="text"
              bind:value={newAbilityName}
              placeholder="Ability name (e.g., Flicker of Deceit)"
              class="ability-name-input"
            />
            <textarea
              bind:value={newAbilityDescription}
              placeholder="Ability description..."
              rows="2"
              class="ability-desc-input"
            ></textarea>
            <div class="ability-options">
              <div class="ability-option">
                <label for="abilityUses">Uses per rest</label>
                <input type="number" id="abilityUses" bind:value={newAbilityUses} min="0" />
              </div>
              <div class="ability-option">
                <label for="restType">Rest type</label>
                <select id="restType" bind:value={newAbilityRestType}>
                  <option value="short">Short</option>
                  <option value="long">Long</option>
                </select>
              </div>
              <div class="ability-option">
                <label>
                  <input type="checkbox" bind:checked={newAbilityRequiresReaction} />
                  Requires Reaction
                </label>
              </div>
            </div>
            <button type="button" class="btn-add" on:click={addAbility}>Add Ability</button>
          </div>
          {#if abilities.length > 0}
            <div class="abilities-list">
              {#each abilities as ability, index}
                <div class="ability-card">
                  <div class="ability-header">
                    <strong>{ability.name}</strong>
                    <button
                      type="button"
                      class="ability-remove"
                      on:click={() => removeAbility(index)}
                      aria-label="Remove {ability.name}">×</button
                    >
                  </div>
                  <p class="ability-description">{ability.description}</p>
                  {#if ability.usesPerRest}
                    <p class="ability-meta">
                      {ability.usesPerRest} use{ability.usesPerRest > 1 ? 's' : ''} per {ability.restType}
                      rest
                      {#if ability.requiresReaction}• Requires Reaction{/if}
                    </p>
                  {:else if ability.requiresReaction}
                    <p class="ability-meta">Requires Reaction</p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={handleCancel}>Cancel</button>
        <button class="btn btn-primary" on:click={handleSave}>Add Condition</button>
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
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--primary-color);
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    color: var(--text-color);
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
    background-color: rgba(0, 0, 0, 0.1);
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--ability-text-color);
    font-size: 0.9rem;
  }

  input[type='text'],
  input[type='number'],
  textarea,
  select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.95rem;
  }

  textarea {
    resize: vertical;
    font-family: inherit;
  }

  .help-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: #666;
    font-style: italic;
  }

  .resistance-input-group {
    display: flex;
    gap: 0.5rem;
  }

  .btn-add {
    padding: 0.5rem 1rem;
    background-color: #8b2e16;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .btn-add:hover {
    background-color: #6d2311;
  }

  .resistance-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .resistance-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    background-color: #e8f4f8;
    border: 1px solid #91d5ff;
    border-radius: 16px;
    font-size: 0.85rem;
    color: #096dd9;
  }

  .tag-remove {
    background: none;
    border: none;
    color: #096dd9;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    width: 1rem;
    height: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tag-remove:hover {
    color: #0050b3;
  }

  .ability-form {
    background: var(--card-bg-secondary);
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .ability-name-input,
  .ability-desc-input {
    margin-bottom: 0.75rem;
  }

  .ability-options {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .ability-option {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .ability-option label {
    margin-bottom: 0;
    font-weight: normal;
    font-size: 0.85rem;
  }

  .ability-option input[type='number'],
  .ability-option select {
    width: auto;
    min-width: 80px;
  }

  .ability-option input[type='checkbox'] {
    width: auto;
    margin-right: 0.5rem;
  }

  .abilities-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .ability-card {
    background: #fff;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .ability-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .ability-header strong {
    color: #2c1810;
  }

  .ability-remove {
    background: none;
    border: none;
    color: #999;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ability-remove:hover {
    color: #666;
  }

  .ability-description {
    margin: 0.5rem 0;
    color: #555;
    font-size: 0.9rem;
  }

  .ability-meta {
    margin: 0.5rem 0 0 0;
    font-size: 0.85rem;
    color: #666;
    font-style: italic;
  }

  .modal-footer {
    padding: 1.5rem;
    border-top: 1px solid #ddd;
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
    background-color: #8b2e16;
    color: white;
  }

  .btn-primary:hover {
    background-color: #6d2311;
  }

  .btn-secondary {
    background-color: #666;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #555;
  }
</style>
