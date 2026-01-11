<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { character, abilityModifiers, searchFilter, collapsedStates, isEditMode } from '$lib/stores';
	import type { Attack, Spell } from '$lib/types';
	import { loadSpells } from '$lib/dndData';

	const dispatch = createEventDispatcher();

	// Track collapsed state for each attack's spell info
	let collapsedSpellInfo: Record<string, boolean> = {};

	function toggleSpellInfo(attackId: string) {
		collapsedSpellInfo[attackId] = !collapsedSpellInfo[attackId];
		collapsedSpellInfo = { ...collapsedSpellInfo }; // Trigger reactivity
	}

	function isHealingSpell(spell: Spell): boolean {
		return spell.description.toLowerCase().includes('regain') && 
		       (spell.description.toLowerCase().includes('hit point') || 
		        spell.description.toLowerCase().includes('hp'));
	}

	function addAttack() {
		character.update(c => {
			c.attacks = [
				...c.attacks,
				{
					id: crypto.randomUUID(),
					name: '',
					bonus: 0,
					damage: '',
					damageType: '',
					notes: ''
				}
			];
			return c;
		});
	}

	function removeAttack(id: string) {
		character.update(c => {
			c.attacks = c.attacks.filter(a => a.id !== id);
			return c;
		});
	}

	function rollAttack(attack: Attack) {
		// If this is a spell attack, consume a spell slot
		let damageToRoll = attack.damage;
		if (attack.spellRef) {
			const spell = getSpellByName(attack.spellRef);
			if (spell && spell.level > 0) {
				const castLevel = attack.castAtLevel || spell.level;
				const hasSlot = checkAndConsumeSpellSlot(castLevel);
				if (!hasSlot) {
					alert(`No level ${castLevel} spell slots available!`);
					return;
				}
				// Use scaled damage if applicable, with half damage if target succeeded on save
				const applyHalfDamage = spell.savingThrow?.halfDamageOnSave && attack.targetSucceededSave;
				damageToRoll = getScaledSpellDamage(attack, spell, applyHalfDamage);
			}
		}
		
		const notation = `1d20${attack.bonus >= 0 ? '+' : ''}${attack.bonus}`;
		dispatch('roll', { 
			notation, 
			damageNotation: damageToRoll,
			attackName: attack.name 
		});
	}

	function rollDamage(attack: Attack) {
		if (!attack.damage) {
			alert(`${attack.name}: No damage specified`);
			return;
		}

		let damageToRoll = attack.damage;
		
		// If this is a spell, handle slot consumption and scaling
		if (attack.spellRef) {
			const spell = getSpellByName(attack.spellRef);
			if (spell && spell.level > 0) {
				const castLevel = attack.castAtLevel || spell.level;
				const hasSlot = checkAndConsumeSpellSlot(castLevel);
				if (!hasSlot) {
					alert(`No level ${castLevel} spell slots available!`);
					return;
				}
				// Use scaled damage if applicable, with half damage if target succeeded on save
				const applyHalfDamage = spell.savingThrow?.halfDamageOnSave && attack.targetSucceededSave;
				damageToRoll = getScaledSpellDamage(attack, spell, applyHalfDamage);
			}
		}

		dispatch('roll', { notation: damageToRoll, attackName: attack.name });
	}

	function toggleCollapse() {
		collapsedStates.update(s => ({ ...s, attacks: !s.attacks }));
	}

	let spells: Spell[] = [];
	let spellsLoaded = false;
	onMount(async () => {
		spells = await loadSpells();
		spellsLoaded = true;
	});

	function getSpellByName(name: string) {
		return spells.find(s => s.name === name);
	}

	function checkAndConsumeSpellSlot(level: number): boolean {
		// Initialize spell slots structure if needed
		if (!$character.classFeatures.spellSlotsByLevel) {
			$character.classFeatures.spellSlotsByLevel = {};
		}
		
		// Get or initialize slots for this level
		if (!$character.classFeatures.spellSlotsByLevel[level]) {
			// Default to 2 slots for any level if not configured
			$character.classFeatures.spellSlotsByLevel[level] = Array(2).fill(false);
		}
		
		const slots = $character.classFeatures.spellSlotsByLevel[level];
		// Find first unused slot
		const availableIndex = slots.findIndex(used => !used);
		
		if (availableIndex === -1) {
			return false; // No slots available
		}
		
		// Mark slot as used
		character.update(c => {
			if (!c.classFeatures.spellSlotsByLevel) {
				c.classFeatures.spellSlotsByLevel = {};
			}
			if (!c.classFeatures.spellSlotsByLevel[level]) {
				c.classFeatures.spellSlotsByLevel[level] = Array(2).fill(false);
			}
			c.classFeatures.spellSlotsByLevel[level][availableIndex] = true;
			return c;
		});
		
		return true;
	}

	function getScaledSpellDamage(attack: Attack, spell: Spell, applyHalfDamage: boolean = false): string {
		let baseDamage = attack.damage;
		let additionalDice = 0;
		
		// Handle higher level slot scaling
		if (spell.higherLevelSlot && attack.castAtLevel) {
			const baseLevel = spell.level;
			const castLevel = attack.castAtLevel || baseLevel;
			const levelDiff = castLevel - baseLevel;
			
			if (levelDiff > 0) {
				// Look for common patterns in higherLevelSlot like "increases by 1d6 for each spell slot level above"
				const increaseMatch = spell.higherLevelSlot.match(/(\d+)d(\d+)\s+for\s+each.*?level\s+above/i);
				if (increaseMatch) {
					const [, increaseDice] = increaseMatch;
					additionalDice += levelDiff * parseInt(increaseDice);
				}
			}
		}
		
		// Handle conditional damage (e.g., Divine Smite vs Fiend/Undead)
		if (attack.targetIsFiendOrUndead && spell.description.includes('Fiend or an Undead')) {
			const bonusMatch = spell.description.match(/increases by (\d+)d(\d+) if.*?Fiend or.*?Undead/i);
			if (bonusMatch) {
				const [, bonusDice] = bonusMatch;
				additionalDice += parseInt(bonusDice);
			}
		}
		
		// Parse the base damage (e.g., "3d6")
		const damageMatch = baseDamage.match(/(\d+)d(\d+)/);
		if (!damageMatch) {
			return baseDamage;
		}
		
		const [, numDice, dieSize] = damageMatch;
		const totalDice = parseInt(numDice) + additionalDice;
		
		// Apply half damage if target succeeded on save
		if (applyHalfDamage) {
			return `(${totalDice}d${dieSize})/2`;
		}
		
		return `${totalDice}d${dieSize}`;
	}

	function getAvailableSpellLevels(spell: Spell): number[] {
		const levels: number[] = [];
		const maxLevel = 9;
		
		for (let level = spell.level; level <= maxLevel; level++) {
			const slots = $character.classFeatures.spellSlotsByLevel?.[level];
			if (slots && slots.length > 0) {
				levels.push(level);
			}
		}
		
		return levels;
	}

	function getAllSpellSlots(): { level: number; available: number; total: number }[] {
		const result: { level: number; available: number; total: number }[] = [];
		const spellSlots = $character.classFeatures.spellSlotsByLevel || {};
		
		for (let level = 1; level <= 9; level++) {
			const slots = spellSlots[level];
			if (slots && slots.length > 0) {
				const total = slots.length;
				const used = slots.filter(s => s).length;
				result.push({ level, available: total - used, total });
			}
		}
		
		return result;
	}

	function rollSpellDamage(attack: Attack) {
		const spell = getSpellByName(attack.spellRef!);
		if (!spell) {
			rollDamage(attack);
			return;
		}
		
		// Check if we have spell slots available
		const castLevel = attack.castAtLevel || spell.level;
		if (castLevel > 0) { // Cantrips don't use slots
			const hasSlot = checkAndConsumeSpellSlot(castLevel);
			if (!hasSlot) {
				alert(`No level ${castLevel} spell slots available!`);
				return;
			}
		}
		
		const applyHalfDamage = spell.savingThrow?.halfDamageOnSave && attack.targetSucceededSave;
		const scaledDamage = getScaledSpellDamage(attack, spell, applyHalfDamage);
		dispatch('roll', { notation: scaledDamage, attackName: attack.name });
	}

	$: filteredAttacks = $character.attacks
		.filter((attack) => {
			if (!$searchFilter) return true;
			const filter = $searchFilter.toLowerCase();
			return attack.name.toLowerCase().includes(filter) ||
				attack.damageType.toLowerCase().includes(filter);
		})
		.sort((a, b) => {
			// Attacks without spellRef come first
			if (!a.spellRef && b.spellRef) return -1;
			if (a.spellRef && !b.spellRef) return 1;
			return 0;
		});

	$: hasVisibleContent = !$searchFilter || filteredAttacks.length > 0 || 
		'attack'.includes($searchFilter.toLowerCase()) ||
		'spell'.includes($searchFilter.toLowerCase());
</script>

<section class="attacks" class:hidden={!hasVisibleContent}>
	<div class="header">
		<h2>Attacks & Spells</h2>
		<button class="collapse-btn" on:click={toggleCollapse} aria-label={$collapsedStates.attacks ? 'Expand' : 'Collapse'}>
			{$collapsedStates.attacks ? '▼' : '▲'}
		</button>
	</div>
	{#if !$collapsedStates.attacks}
	<button on:click={addAttack} class="btn btn-secondary">Add Attack</button>

	<div class="attacks-list">
		{#each filteredAttacks as attack (attack.id)}
			<div class="attack-card">
				<div class="attack-header">
					<input
						type="text"
						bind:value={attack.name}
						placeholder="Attack name"
						class="attack-name"
					/>
					{#if $isEditMode}
						<button on:click={() => removeAttack(attack.id)} class="btn-remove">×</button>
					{/if}
				</div>
				<div class="attack-details">
					<div class="attack-field">
						<label>Bonus</label>
						<input type="number" bind:value={attack.bonus} class="attack-bonus" />
					</div>
					<div class="attack-field">
						<label>Damage</label>
						<input
							type="text"
							bind:value={attack.damage}
							placeholder="e.g., 2d6+3"
							class="attack-damage"
						/>
					</div>
					<div class="attack-field">
						<label>Type</label>
						<input
							type="text"
							bind:value={attack.damageType}
							placeholder="e.g., slashing"
							class="attack-type"
						/>
					</div>
				</div>
				{#if attack.spellRef}
					{#if spells.length === 0}
						<div class="spell-info-loading">Loading spell info...</div>
					{:else}
						{@const spell = getSpellByName(attack.spellRef)}
						{#if spell}
							{#if attack.generalNotes}
								 <div class="spell-notes">
									 <h4>General Notes</h4>
									 <p>{attack.generalNotes}</p>
								 </div>
							{/if}
							<div class="spell-info">
								<div class="spell-info-header" on:click={() => toggleSpellInfo(attack.id)} on:keydown={(e) => e.key === 'Enter' && toggleSpellInfo(attack.id)} role="button" tabindex="0">
									<h4>Spell Info</h4>
									<button class="collapse-btn-small" aria-label={collapsedSpellInfo[attack.id] ? 'Expand' : 'Collapse'}>
										{collapsedSpellInfo[attack.id] ? '▼' : '▲'}
									</button>
								</div>
								{#if !collapsedSpellInfo[attack.id]}
									<ul>
										<li><strong>Level:</strong> {spell.level}</li>
										<li><strong>Casting Time:</strong> {spell.castingTime || spell.actionType}</li>
										<li><strong>Range:</strong> {spell.range}</li>
										<li><strong>Components:</strong> {spell.components.join(', ')}{#if spell.material} ({spell.material}){/if}</li>
										<li><strong>Duration:</strong> {#if spell.concentration}Concentration, {/if}{spell.duration}</li>
										<li><strong>Description:</strong> {spell.description}</li>
										{#if spell.higherLevelSlot}
											<li><strong>At Higher Levels:</strong> {spell.higherLevelSlot}</li>
										{/if}
	
									</ul>
								{/if}
							</div>
							{#if spell.higherLevelSlot && spell.level > 0}
								{@const availableLevels = getAvailableSpellLevels(spell)}
								{#if availableLevels.length > 0}
									<div class="spell-level-selector">
										<label for="castLevel-{attack.id}">Cast at Level:</label>
										<select 
											id="castLevel-{attack.id}"
											bind:value={attack.castAtLevel}
											class="spell-level-select use-enabled"
										>
											{#each availableLevels as level}
												<option value={level}>
													Level {level}
												</option>
											{/each}
										</select>
										{#if attack.castAtLevel && attack.castAtLevel > spell.level}
											{@const scaledDamage = getScaledSpellDamage(attack, spell)}
											<span class="scaled-damage">
												{#if isHealingSpell(spell)}
													 Healing
												{:else}
													Damage
												{/if}
												{scaledDamage}</span>
										{/if}
									</div>								{#if spell.description.includes('Fiend or an Undead')}
									<div class="target-condition">
										<label>
											<input 
												type="checkbox" 
												bind:checked={attack.targetIsFiendOrUndead}
												class="use-enabled"
											/>
											Target is Fiend or Undead
											{#if attack.targetIsFiendOrUndead}
												{@const scaledDamage = getScaledSpellDamage(attack, spell)}
												<span class="scaled-damage">(+1d8, total: {scaledDamage})</span>
											{/if}
										</label>
									</div>
								{/if}
								{#if spell.savingThrow}
									<div class="target-condition">
										<label>
											<input 
												type="checkbox" 
												bind:checked={attack.targetSucceededSave}
												class="use-enabled"
											/>
											Target succeeded on {spell.savingThrow.ability.charAt(0).toUpperCase() + spell.savingThrow.ability.slice(1)} save
											{#if attack.targetSucceededSave && spell.savingThrow.halfDamageOnSave}
												<span class="scaled-damage">(Half damage)</span>
											{:else if attack.targetSucceededSave && !spell.savingThrow.halfDamageOnSave}
												<span class="scaled-damage">(No damage)</span>
											{/if}
										</label>
									</div>
								{/if}								{:else}
									<div class="spell-level-selector">
										<span style="color: #dc3545; font-weight: bold;">No spell slots available!</span>
									</div>
								{/if}
							{/if}
						{:else}
							<div class="spell-info-missing">Spell info not found.</div>
						{/if}
					{/if}
				{/if}
				{#if !attack.spellRef}
					<div class="attack-notes">
						<label>Notes</label>
						<textarea
							bind:value={attack.notes}
							placeholder="e.g., DC 15 Dex save, Range 120 ft, Concentration"
							class="notes-input"
							rows="2"
						/>
					</div>
				{/if}
				<div class="attack-actions">
					{#if attack.bonus !== 0 || !attack.spellRef}
						<button on:click={() => rollAttack(attack)} class="btn btn-primary">Roll Attack</button>
					{/if}
					{#if attack.spellRef && spellsLoaded}
						{@const spell = getSpellByName(attack.spellRef)}
						<button on:click={() => rollDamage(attack)} class="btn btn-secondary">
							{#if spell && isHealingSpell(spell)}
								Roll Healing
							{:else}
								Roll Damage
							{/if}
						</button>
					{:else}
						<button on:click={() => rollDamage(attack)} class="btn btn-secondary">Roll Damage</button>
					{/if}
				</div>
			</div>
		{/each}

		{#if $character.attacks.length === 0}
			<p class="no-attacks">No attacks added yet. Click "Add Attack" to create one.</p>
		{:else if filteredAttacks.length === 0}
			<p class="no-attacks">No attacks match your search.</p>
		{/if}
	</div>
	{/if}
</section>

<style>
	.attacks {
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

	.attacks-list {
		margin-top: 15px;
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.attack-card {
		background-color: #f9f9f9;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 15px;
	}

	.attack-header {
		display: flex;
		gap: 10px;
		margin-bottom: 10px;
	}

	.attack-name {
		flex: 1;
		padding: 8px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-size: 1rem;
		font-weight: bold;
	}

	.btn-remove {
		width: 32px;
		height: 32px;
		background-color: #dc3545;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1.5rem;
		line-height: 1;
		transition: background-color 0.2s;
	}

	.btn-remove:hover {
		background-color: #c82333;
	}

	.attack-details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 10px;
		margin-bottom: 10px;
	}

	.attack-field {
		display: flex;
		flex-direction: column;
	}

	.attack-field label {
		font-size: 0.85rem;
		font-weight: bold;
		margin-bottom: 4px;
	}

	.attack-field input {
		padding: 6px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
	}

	.attack-notes {
		margin-top: 10px;
	}

	.attack-notes label {
		font-size: 0.85rem;
		font-weight: bold;
		margin-bottom: 4px;
		display: block;
	}

	.notes-input {
		width: 100%;
		padding: 6px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-family: inherit;
		resize: vertical;
		min-height: 40px;
	}

	.notes-input:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	.attack-bonus {
		width: 100%;
	}

	.attack-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.no-attacks {
		text-align: center;
		color: #666;
		padding: 30px;
		font-style: italic;
	}

	input:focus {
		outline: none;
		border-color: var(--primary-color);
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

	.spell-info {
		margin-top: 10px;
		padding: 10px;
		background-color: #e9f5ff;
		border: 1px solid #b3e0ff;
		border-radius: 4px;
	}

	.spell-info-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		user-select: none;
	}

	.spell-info-header:hover {
		opacity: 0.8;
	}

	.collapse-btn-small {
		background: none;
		border: none;
		font-size: 0.9rem;
		cursor: pointer;
		color: #007bff;
		padding: 0;
		transition: transform 0.2s ease;
	}

	.collapse-btn-small:hover {
		transform: scale(1.1);
	}

	.spell-info h4 {
		margin: 0 0 10px 0;
		font-size: 1.1rem;
		color: #007bff;
	}

	.spell-info ul {
		list-style-type: none;
		padding: 0;
		margin: 0;
	}

	.spell-info li {
		margin-bottom: 5px;
	}

	.spell-notes {
		margin-top: 10px;
		padding: 10px;
		background-color: #fff3cd;
		border: 1px solid #ffeeba;
		border-radius: 4px;
	}

	.spell-notes h4 {
		margin: 0 0 10px 0;
		font-size: 1.1rem;
		color: #856404;
	}

	.spell-info-loading {
		margin-top: 10px;
		padding: 10px;
		background-color: #e2e3e5;
		border: 1px solid #ced4da;
		border-radius: 4px;
		color: #495057;
		font-size: 0.9rem;
		text-align: center;
	}

	.spell-info-missing {
		margin-top: 10px;
		padding: 10px;
		background-color: #f8d7da;
		border: 1px solid #f5c6cb;
		border-radius: 4px;
		color: #721c24;
		font-size: 0.9rem;
		text-align: center;
	}

	.spell-level-selector {
		margin-top: 10px;
		padding: 10px;
		background-color: #e7f3ff;
		border: 1px solid #b3d9ff;
		border-radius: 4px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.target-condition {
		margin-top: 10px;
		padding: 10px;
		background-color: #fff3e0;
		border: 1px solid #ffcc80;
		border-radius: 4px;
	}

	.target-condition label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		font-weight: normal;
		cursor: pointer;
	}

	.target-condition input[type="checkbox"] {
		cursor: pointer;
		width: 16px;
		height: 16px;
	}

	.spell-level-selector label {
		font-weight: bold;
		font-size: 0.9rem;
	}

	.spell-level-select {
		padding: 5px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.scaled-damage {
		font-weight: bold;
		color: #007bff;
		font-size: 0.9rem;
	}

	.hit-dice-controls {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 10px;
	}

	.hit-dice-count-input {
		width: 60px;
		padding: 5px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		text-align: center;
	}

	.hit-dice-type {
		font-size: 0.9rem;
		color: #666;
		margin-left: 5px;
	}
</style>
