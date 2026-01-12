<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { character, abilityModifiers, searchFilter, collapsedStates } from '$lib/stores';
  import { SKILL_ABILITIES } from '$lib/types';
  import type { SkillName } from '$lib/types';

  const dispatch = createEventDispatcher();

  const skills: { key: SkillName; label: string }[] = [
    { key: 'acrobatics', label: 'Acrobatics' },
    { key: 'animalHandling', label: 'Animal Handling' },
    { key: 'arcana', label: 'Arcana' },
    { key: 'athletics', label: 'Athletics' },
    { key: 'deception', label: 'Deception' },
    { key: 'history', label: 'History' },
    { key: 'insight', label: 'Insight' },
    { key: 'intimidation', label: 'Intimidation' },
    { key: 'investigation', label: 'Investigation' },
    { key: 'medicine', label: 'Medicine' },
    { key: 'nature', label: 'Nature' },
    { key: 'perception', label: 'Perception' },
    { key: 'performance', label: 'Performance' },
    { key: 'persuasion', label: 'Persuasion' },
    { key: 'religion', label: 'Religion' },
    { key: 'sleightOfHand', label: 'Sleight of Hand' },
    { key: 'stealth', label: 'Stealth' },
    { key: 'survival', label: 'Survival' }
  ];

  function getSkillModifier(skill: SkillName): number {
    const ability = SKILL_ABILITIES[skill];
    const abilityMod = $abilityModifiers[ability];
    const profBonus = $character.skillProficiencies[skill] ? $character.proficiencyBonus : 0;
    return abilityMod + profBonus;
  }

  function rollSkill(skill: SkillName) {
    const modifier = getSkillModifier(skill);
    const notation = `1d20${modifier >= 0 ? '+' : ''}${modifier}`;
    dispatch('roll', notation);
  }

  function toggleCollapse() {
    collapsedStates.update((s: any) => ({ ...s, skills: !s.skills }));
  }

  $: filteredSkills = skills.filter(({ label }) => {
    if (!$searchFilter) return true;
    return label.toLowerCase().includes($searchFilter.toLowerCase());
  });

  $: hasVisibleContent = filteredSkills.length > 0;
</script>

<section class="skills" class:hidden={!hasVisibleContent}>
  <div class="header">
    <h2>Skills</h2>
    <button
      class="collapse-btn"
      on:click={toggleCollapse}
      aria-label={$collapsedStates.skills ? 'Expand' : 'Collapse'}
    >
      {$collapsedStates.skills ? '▼' : '▲'}
    </button>
  </div>
  {#if !$collapsedStates.skills}
    <div class="skills-grid">
      {#each filteredSkills as { key, label }}
        {@const ability = SKILL_ABILITIES[key]}
        {@const modifier = getSkillModifier(key)}
        <div class="skill-row">
          <input type="checkbox" bind:checked={$character.skillProficiencies[key]} id={key} />
          <label for={key}>
            {label}
            <span class="ability-tag">({ability.substring(0, 3).toUpperCase()})</span>
          </label>
          <span class="skill-modifier">{modifier >= 0 ? '+' : ''}{modifier}</span>
          <button class="roll-btn" on:click={() => rollSkill(key)}>Roll</button>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .skills {
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

  .hidden {
    display: none;
  }

  .skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 10px;
  }

  .skill-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background-color: #f9f9f9;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .skill-row:hover {
    background-color: #f0f0f0;
  }

  .skill-row label {
    flex: 1;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .ability-tag {
    font-size: 0.75rem;
    color: #666;
  }

  .skill-modifier {
    font-weight: bold;
    min-width: 35px;
    text-align: right;
    color: var(--primary-color);
  }

  .roll-btn {
    padding: 4px 12px;
    background-color: var(--secondary-color);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: background-color 0.2s;
  }

  .roll-btn:hover {
    background-color: #b89872;
  }

  input[type='checkbox'] {
    cursor: pointer;
  }

  .roll-notification {
    background: #4caf50;
    color: white;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 15px;
    font-weight: bold;
    text-align: center;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
