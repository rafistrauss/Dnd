<script lang="ts">
	import { onMount } from 'svelte';
	import { character } from '$lib/stores';
	import { loadSpells, loadFeats, searchSpells, searchFeats, filterSpellsByLevel, type Spell, type Feat } from '$lib/dndData';
	import type { Attack } from '$lib/types';
	
	export let onClose: () => void;
	
	let contentType: 'spell' | 'feat' = 'spell';
	let loading = true;
	let searchQuery = '';
	let selectedLevel: number | null = null;
	
	let allSpells: Spell[] = [];
	let allFeats: Feat[] = [];
	let selectedItem: Spell | Feat | null = null;
	
	$: filteredSpells = selectedLevel !== null 
		? filterSpellsByLevel(searchSpells(allSpells, searchQuery), selectedLevel)
		: searchSpells(allSpells, searchQuery);
	
	$: filteredFeats = searchFeats(allFeats, searchQuery);
	
	$: displayedItems = contentType === 'spell' ? filteredSpells : filteredFeats;
	
	onMount(async () => {
		loading = true;
		try {
			allSpells = await loadSpells();
			allFeats = await loadFeats();
		} catch (error) {
			console.error('Failed to load data:', error);
		} finally {
			loading = false;
		}
	});
	
	function selectItem(item: Spell | Feat) {
		selectedItem = item;
	}
	
	function extractDamage(description: string): string {
		// Look for common damage patterns like "1d6", "2d8", "3d10", etc.
		const damageMatch = description.match(/(\d+d\d+(?:\s*\+\s*\d+)?)/i);
		return damageMatch ? damageMatch[1] : '';
	}
	
	function extractSpellSummary(description: string): string {
		// Get first sentence
		const firstSentence = description.split(/\.( |$)/)[0].trim();
		// Get bolded effect names (e.g., **Beckon Air.**)
		const boldMatches = Array.from(description.matchAll(/\*\*(.*?)\*\*/g)).map(m => m[1].replace(/\.$/, ''));
		let summary = firstSentence;
		if (boldMatches.length) {
			summary += ' | Effects: ' + boldMatches.join(', ');
		}
		return summary;
	}
	
	function handleImport() {
		if (!selectedItem) return;

		if (contentType === 'spell') {
			const spell = selectedItem as Spell;
			character.update(c => {
				const spellBonus = 5;
				const infoParts = [];
				if (spell.range) infoParts.push(`Range: ${spell.range}`);
				if (spell.castingTime) infoParts.push(`Cast: ${spell.castingTime}`);
				if (spell.duration) infoParts.push(`Duration: ${spell.duration}`);
				if (spell.actionType === 'Save') {
					infoParts.push('Saving throw spell');
				}
				if (spell.components && spell.components.length > 0) {
					infoParts.push(`Components: ${spell.components.join(', ')}`);
				}
				if (spell.material) {
					infoParts.push(`Material: ${spell.material}`);
				}
				const infoNotes = infoParts.join(' | ');
				const spellAttack: Attack = {
					id: crypto.randomUUID(),
					name: `${spell.name}${spell.concentration ? ' (C)' : ''}${spell.ritual ? ' (R)' : ''}`,
					bonus: spell.actionType === 'Attack' ? spellBonus : 0,
					damage: extractDamage(spell.description),
					damageType: `${spell.school} (Lvl ${spell.level})`,
					spellRef: spell.name,
					infoNotes,
				};
				c.attacks = [...c.attacks, spellAttack];
				return c;
			});
		} else if (contentType === 'feat') {
			const feat = selectedItem as Feat;
			// Add to features
			character.update(c => {
				const featEntry = `${feat.name}${feat.prerequisite ? ` (Req: ${feat.prerequisite})` : ''}\n${feat.description}\n`;
				c.features = c.features ? `${c.features}\n${featEntry}` : featEntry;
				return c;
			});
		}
		
		selectedItem = null;
		onClose();
	}
	
	function getSchoolAbbr(school: string): string {
		const abbr: Record<string, string> = {
			'Abjuration': 'A',
			'Conjuration': 'C',
			'Divination': 'D',
			'Enchantment': 'E',
			'Evocation': 'V',
			'Illusion': 'I',
			'Necromancy': 'N',
			'Transmutation': 'T'
		};
		return abbr[school] || '';
	}
</script>

<div class="modal-backdrop" on:click={onClose} on:keydown={(e) => e.key === 'Escape' && onClose()} role="presentation">
	<div class="modal" on:click|stopPropagation on:keydown role="dialog" aria-modal="true" tabindex="-1">
		<div class="modal-header">
			<h2>Browse D&D Spells & Feats</h2>
			<button class="close-btn" on:click={onClose} aria-label="Close">&times;</button>
		</div>
		
		<div class="modal-body">
			{#if loading}
				<div class="loading">Loading D&D data...</div>
			{:else}
				<div class="controls">
					<div class="tabs">
						<button 
							class="tab" 
							class:active={contentType === 'spell'}
							on:click={() => { contentType = 'spell'; selectedItem = null; searchQuery = ''; }}
						>
							📜 Spells ({allSpells.length})
						</button>
						<button 
							class="tab" 
							class:active={contentType === 'feat'}
							on:click={() => { contentType = 'feat'; selectedItem = null; searchQuery = ''; }}
						>
							⭐ Feats ({allFeats.length})
						</button>
					</div>
					
					<div class="search-controls">
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search by name or description..."
							class="search-input"
						/>
						
						{#if contentType === 'spell'}
							<select bind:value={selectedLevel} class="level-filter">
								<option value={null}>All Levels</option>
								<option value={0}>Cantrip</option>
								{#each [1,2,3,4,5,6,7,8,9] as level}
									<option value={level}>Level {level}</option>
								{/each}
							</select>
						{/if}
					</div>
				</div>
				
				<div class="content-container">
					<div class="items-list">
						{#if displayedItems.length === 0}
							<div class="no-results">No {contentType}s found</div>
						{:else}
							{#each displayedItems as item}
								<button 
									class="item-card"
									class:selected={selectedItem?.name === item.name}
									on:click={() => selectItem(item)}
								>
									<div class="item-name">{item.name}</div>
									{#if contentType === 'spell'}
										{@const spell = item as Spell}
										<div class="item-meta">
											Level {spell.level} • {spell.school}
										</div>
									{:else}
										{@const feat = item as Feat}
										{#if feat.prerequisite}
											<div class="item-meta">{feat.prerequisite}</div>
										{/if}
									{/if}
								</button>
							{/each}
						{/if}
					</div>
					
					{#if selectedItem}
						<div class="item-details">
							{#if contentType === 'spell'}
								{@const spell = selectedItem as Spell}
								<h3>{spell.name}</h3>
								<p class="spell-meta">
									{#if spell.level === 0}
										{spell.school} cantrip
									{:else}
										Level {spell.level} {spell.school}
									{/if}
									{#if spell.ritual} (ritual){/if}
								</p>
								<p class="spell-classes">
									<strong>Classes:</strong> {spell.classes.join(', ')}
								</p>
								<div class="spell-stats">
									<div><strong>Casting Time:</strong> {spell.castingTime || spell.actionType}</div>
									<div><strong>Range:</strong> {spell.range}</div>
									<div><strong>Components:</strong> {spell.components.join(', ').toUpperCase()}{#if spell.material} ({spell.material}){/if}</div>
									<div><strong>Duration:</strong> {#if spell.concentration}Concentration, {/if}{spell.duration}</div>
								</div>
								<p class="description">{spell.description}</p>
								{#if spell.higherLevelSlot}
									<p class="higher-levels"><strong>At Higher Levels:</strong> {spell.higherLevelSlot}</p>
								{/if}
								{#if spell.cantripUpgrade}
									<p class="cantrip-upgrade"><strong>Cantrip Upgrade:</strong> {spell.cantripUpgrade}</p>
								{/if}
							{:else}
								{@const feat = selectedItem as Feat}
								<h3>{feat.name}</h3>
								{#if feat.prerequisite}
									<p class="prerequisite"><strong>Prerequisite:</strong> {feat.prerequisite}</p>
								{/if}
								<p class="description">{feat.description}</p>
								<a href={feat.source} target="_blank" rel="noopener" class="source-link">
									View Full Details →
								</a>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>
		
		<div class="modal-footer">
			<button on:click={onClose} class="btn-secondary">Cancel</button>
			<button 
				on:click={handleImport} 
				disabled={!selectedItem}
				class="btn-primary"
			>
				Add to Character Sheet
			</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
	}

	.modal {
		background: var(--card-bg);
		border-radius: 8px;
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px;
		border-bottom: 2px solid var(--border-color);
	}

	.modal-header h2 {
		margin: 0;
		color: var(--primary-color);
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 28px;
		cursor: pointer;
		color: var(--text-color);
		padding: 0;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s;
	}

	.close-btn:hover {
		color: var(--primary-color);
	}

	.modal-body {
		padding: 20px;
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
	}

	.loading {
		text-align: center;
		padding: 40px;
		color: var(--text-muted);
		font-size: 1.1rem;
	}

	.controls {
		margin-bottom: 20px;
	}

	.tabs {
		display: flex;
		gap: 5px;
		margin-bottom: 15px;
		border-bottom: 2px solid var(--border-color);
	}

	.tab {
		padding: 10px 20px;
		background: none;
		border: none;
		border-bottom: 3px solid transparent;
		cursor: pointer;
		font-weight: bold;
		font-size: 1rem;
		color: var(--text-muted);
		transition: all 0.2s;
	}

	.tab:hover {
		color: var(--primary-color);
	}

	.tab.active {
		color: var(--primary-color);
		border-bottom-color: var(--primary-color);
	}

	.search-controls {
		display: flex;
		gap: 10px;
	}

	.search-input {
		flex: 1;
		padding: 10px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-size: 14px;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	.level-filter {
		padding: 10px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-size: 14px;
		background: white;
		cursor: pointer;
	}

	.content-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 15px;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.items-list {
		border: 1px solid var(--border-color);
		border-radius: 4px;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 5px;
		background: #f9f9f9;
		height: 100%;
	}

	.no-results {
		padding: 40px;
		text-align: center;
		color: var(--text-muted);
	}

	.item-card {
		width: 100%;
		padding: 12px;
		margin-bottom: 5px;
		background: white;
		border: 2px solid transparent;
		border-radius: 4px;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s;
	}

	.item-card:hover {
		border-color: var(--primary-color);
		transform: translateX(3px);
	}

	.item-card.selected {
		background: #e3f2fd;
		border-color: var(--primary-color);
	}

	.item-name {
		font-weight: bold;
		margin-bottom: 4px;
		color: var(--text-color);
	}

	.item-meta {
		font-size: 12px;
		color: var(--text-muted);
	}

	.item-details {
		border: 1px solid var(--border-color);
		border-radius: 4px;
		padding: 20px;
		overflow-y: auto;
		overflow-x: hidden;
		background: white;
		height: 100%;
	}

	.item-details h3 {
		margin-top: 0;
		color: var(--primary-color);
	}

	.spell-meta, .prerequisite {
		font-style: italic;
		color: var(--text-muted);
		margin-bottom: 10px;
	}

	.spell-stats {
		display: grid;
		gap: 8px;
		margin: 15px 0;
		padding: 10px;
		background: #f5f5f5;
		border-radius: 4px;
	}

	.description {
		margin: 15px 0;
		line-height: 1.6;
		color: var(--text-color);
	}

	.source-link {
		display: inline-block;
		color: var(--primary-color);
		text-decoration: none;
		font-weight: bold;
		margin-top: 10px;
	}

	.source-link:hover {
		text-decoration: underline;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 20px;
		border-top: 2px solid var(--border-color);
	}

	.btn-secondary, .btn-primary {
		padding: 10px 20px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
		transition: all 0.2s;
	}

	.btn-secondary {
		background: #e0e0e0;
		color: #333;
	}

	.btn-secondary:hover {
		background: #d0d0d0;
	}

	.btn-primary {
		background: var(--primary-color);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #a50000;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.btn-primary:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	/* Mobile responsive styles */
	@media (max-width: 768px) {
		.modal-overlay {
			padding: 10px;
		}

		.modal {
			max-width: 100%;
			max-height: 95vh;
		}

		.modal-header {
			padding: 15px;
		}

		.modal-header h2 {
			font-size: 1.3rem;
		}

		.modal-body {
			padding: 15px;
		}

		.tabs {
			gap: 3px;
			margin-bottom: 12px;
		}

		.tab {
			padding: 8px 12px;
			font-size: 0.9rem;
		}

		.search-controls {
			flex-direction: column;
			gap: 8px;
		}

		.search-input, .level-filter {
			width: 100%;
			padding: 8px;
			font-size: 16px; /* Prevents zoom on iOS */
		}

		.content-container {
			grid-template-columns: 1fr;
			gap: 10px;
		}

		.items-list {
			height: 250px;
			max-height: 250px;
		}

		.item-details {
			height: 300px;
			max-height: 300px;
		}

		.item-card {
			padding: 10px;
		}

		.item-name {
			font-size: 0.95rem;
		}

		.item-details {
			padding: 15px;
		}

		.item-details h3 {
			font-size: 1.2rem;
		}

		.spell-stats {
			font-size: 0.9rem;
			padding: 8px;
		}

		.modal-footer {
			padding: 15px;
			gap: 8px;
		}

		.btn-secondary, .btn-primary {
			padding: 10px 15px;
			font-size: 0.95rem;
			flex: 1;
		}
	}

	@media (max-width: 480px) {
		.modal-header h2 {
			font-size: 1.1rem;
		}

		.tab {
			padding: 6px 10px;
			font-size: 0.85rem;
		}

		.items-list {
			height: 200px;
			max-height: 200px;
		}

		.item-details {
			height: 250px;
			max-height: 250px;
		}

		.item-card {
			padding: 8px;
		}

		.item-name {
			font-size: 0.9rem;
		}

		.item-meta {
			font-size: 0.75rem;
		}

		.item-details h3 {
			font-size: 1.1rem;
		}

		.spell-stats {
			font-size: 0.85rem;
		}

		.description {
			font-size: 0.9rem;
		}
	}
</style>
