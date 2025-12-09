<script lang="ts">
	import { character, abilityModifiers, calculateModifier, searchFilter } from '$lib/stores';
	import {
		getClassConfig,
		getAvailableFeatures,
		getSpellSlots,
		getPreparedSpellsCount,
		getSpellSaveDC
	} from '$lib/classConfig';
	import { onMount } from 'svelte';
	let isCollapsed = false;

	$: classConfig = $character.class ? getClassConfig($character.class) : null;
	$: features = $character.class ? getAvailableFeatures($character.class, $character.level) : [];
	$: spellSlots = $character.class ? getSpellSlots($character.class, $character.level) : 0;

	let spellSaveDC = 0;
	let preparedCount = 0;

	$: if (classConfig?.spellcaster && classConfig.spellcastingAbility) {
		const abilityMod = $abilityModifiers[classConfig.spellcastingAbility];
		spellSaveDC = getSpellSaveDC($character.class, abilityMod, $character.proficiencyBonus) || 0;
		preparedCount = getPreparedSpellsCount($character.class, $character.level, abilityMod);
	}

	function resetFeature(featureKey: string, maxUses: number) {
		character.update(c => {
			if (!c.classFeatures.features[featureKey]) {
				c.classFeatures.features[featureKey] = [];
			}
			c.classFeatures.features[featureKey] = Array(maxUses).fill(false);
			return c;
		});
	}

	function resetPool(featureKey: string, maxPool: number) {
		character.update(c => {
			c.classFeatures.features[featureKey] = maxPool;
			return c;
		});
	}

	function resetSpellSlots() {
		character.update(c => {
			c.classFeatures.spellSlots = Array(spellSlots).fill(false);
			return c;
		});
	}

	function getMaxUses(feature: any): number {
		if (typeof feature.maxUses === 'function') {
			if (feature.name === 'Divine Sense' && classConfig?.spellcastingAbility) {
				const abilityMod = $abilityModifiers[classConfig.spellcastingAbility];
				return feature.maxUses($character.level, abilityMod);
			}
			return feature.maxUses($character.level);
		}
		return feature.maxUses || 0;
	}

	function getMaxPool(feature: any): number {
		if (typeof feature.maxPool === 'function') {
			return feature.maxPool($character.level);
		}
		return feature.maxPool || 0;
	}

	function getDescription(feature: any): string {
		if (typeof feature.description === 'function') {
			return feature.description($character.level);
		}
		return feature.description;
	}

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
	}

	$: filteredFeatures = features.filter((feature) => {
		if (!$searchFilter) return true;
		const filter = $searchFilter.toLowerCase();
		return feature.name.toLowerCase().includes(filter) ||
			getDescription(feature).toLowerCase().includes(filter);
	});

	$: hasVisibleContent = !$searchFilter || $character.class || 
		'class features'.includes($searchFilter.toLowerCase()) ||
		'spellcasting'.includes($searchFilter.toLowerCase()) ||
		filteredFeatures.length > 0;
</script>

<section class="class-features" class:hidden={!hasVisibleContent}>
	<div class="header">
		<h2>Class Features</h2>
		<button class="collapse-btn" on:click={toggleCollapse} aria-label={isCollapsed ? 'Expand' : 'Collapse'}>
			{isCollapsed ? '▼' : '▲'}
		</button>
	</div>
	{#if !isCollapsed}
	{#if !$character.class}
		<p class="no-features">Select a class to see available features</p>
	{:else if features.length === 0}
		<p class="no-features">No class features available at this level</p>
	{:else}
		<div class="features-grid">
			{#if classConfig?.spellcaster}
				<div class="feature-box spellcasting">
					<h3>Spellcasting ({classConfig.spellcastingAbility?.toUpperCase()})</h3>
					<div class="spell-stats">
						<div class="spell-stat">
							<label>Spell Save DC</label>
							<div class="spell-value">{spellSaveDC}</div>
						</div>
						<div class="spell-stat">
							<label>Prepared Spells</label>
							<div class="spell-value">{preparedCount}</div>
						</div>
					</div>
					{#if spellSlots > 0}
						<div class="spell-slots">
							<label>1st Level Spell Slots</label>
							<div class="slots-tracker">
								{#each Array(spellSlots) as _, i}
									<input
										type="checkbox"
										bind:checked={$character.classFeatures.spellSlots[i]}
										class="slot-checkbox"
									/>
								{/each}
								<button on:click={resetSpellSlots} class="btn-small">Long Rest</button>
							</div>
						</div>
					{/if}
					<div class="prepared-spells">
						<label>Prepared Spells</label>
						<textarea
							bind:value={$character.classFeatures.preparedSpells}
							placeholder="List your prepared spells..."
						></textarea>
					</div>
				</div>
			{/if}

			{#each filteredFeatures as feature}
				{@const featureKey = feature.name.replace(/\s+/g, '')}
				{@const featureData = $character.classFeatures.features[featureKey]}
				{@const isArrayData = Array.isArray(featureData)}
				{@const isNumericData = typeof featureData === 'number'}
				<div class="feature-box">
					<h3>{feature.name}</h3>
					<p class="feature-description">{getDescription(feature)}</p>

					{#if feature.type === 'uses'}
						{@const maxUses = getMaxUses(feature)}
						<div class="uses-tracker">
							{#if maxUses === Infinity}
								<p class="unlimited">Unlimited Uses</p>
							{:else}
								{#each Array(maxUses) as _, i}
									{#if isArrayData}
										<input
											type="checkbox"
											checked={(featureData && featureData[i]) || false}
											on:change={(e) => {
												character.update(c => {
													if (!c.classFeatures.features[featureKey]) {
														c.classFeatures.features[featureKey] = [];
													}
													const arr = c.classFeatures.features[featureKey] as boolean[];
													arr[i] = e.currentTarget.checked;
													return c;
												});
											}}
											class="use-checkbox"
										/>
									{:else}
										<input
											type="checkbox"
											checked={false}
											on:change={(e) => {
												character.update(c => {
													if (!c.classFeatures.features[featureKey]) {
														c.classFeatures.features[featureKey] = [];
													}
													const arr = c.classFeatures.features[featureKey] as boolean[];
													arr[i] = e.currentTarget.checked;
													return c;
												});
											}}
											class="use-checkbox"
										/>
									{/if}
								{/each}
								<button on:click={() => resetFeature(featureKey, maxUses)} class="btn-small">
									{feature.resetOn === 'short' ? 'Short Rest' : 'Long Rest'}
								</button>
							{/if}
						</div>
					{:else if feature.type === 'pool'}
						{@const maxPool = getMaxPool(feature)}
						<div class="pool-tracker">
							<input
								type="number"
								value={isNumericData && featureData !== undefined ? featureData : maxPool}
								on:input={(e) => {
									character.update(c => {
										c.classFeatures.features[featureKey] = parseInt(e.currentTarget.value) || 0;
										return c;
									});
								}}
								min="0"
								max={maxPool}
								class="pool-input"
							/>
							<span>/ {maxPool}</span>
							<button on:click={() => resetPool(featureKey, maxPool)} class="btn-small">
								{feature.resetOn === 'short' ? 'Short Rest' : 'Long Rest'}
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
	{/if}
</section>

<style>
	.class-features {
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

	.no-features {
		text-align: center;
		color: #666;
		padding: 30px;
		font-style: italic;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 15px;
	}

	.feature-box {
		background-color: #f9f9f9;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 15px;
	}

	.feature-box h3 {
		margin: 0 0 10px 0;
		color: var(--primary-color);
		font-size: 1.1rem;
	}

	.feature-description {
		font-size: 0.9rem;
		color: #555;
		margin-bottom: 10px;
	}

	.spellcasting {
		grid-column: 1 / -1;
	}

	.spell-stats {
		display: flex;
		gap: 20px;
		margin-bottom: 15px;
	}

	.spell-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.spell-stat label {
		font-size: 0.85rem;
		font-weight: bold;
		margin-bottom: 5px;
	}

	.spell-value {
		font-size: 1.5rem;
		font-weight: bold;
		color: var(--primary-color);
	}

	.spell-slots {
		margin-bottom: 15px;
	}

	.spell-slots label {
		display: block;
		font-weight: bold;
		margin-bottom: 8px;
	}

	.slots-tracker {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.slot-checkbox,
	.use-checkbox {
		width: 20px;
		height: 20px;
		cursor: pointer;
	}

	.uses-tracker,
	.pool-tracker {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.pool-input {
		width: 70px;
		padding: 6px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		text-align: center;
		font-weight: bold;
	}

	.btn-small {
		padding: 4px 10px;
		background-color: var(--secondary-color);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: background-color 0.2s;
	}

	.btn-small:hover {
		background-color: #b89872;
	}

	.unlimited {
		font-weight: bold;
		color: var(--primary-color);
		margin: 0;
	}

	.prepared-spells {
		margin-top: 15px;
	}

	.prepared-spells label {
		display: block;
		font-weight: bold;
		margin-bottom: 8px;
	}

	.prepared-spells textarea {
		width: 100%;
		min-height: 80px;
		padding: 8px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-family: inherit;
		font-size: 0.9rem;
		resize: vertical;
	}

	textarea:focus,
	input:focus {
		outline: none;
		border-color: var(--primary-color);
	}
</style>
