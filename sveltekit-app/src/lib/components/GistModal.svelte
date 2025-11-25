<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { character } from '$lib/stores';
	import { saveToGist, updateGist, loadFromGist, loadGistConfig, saveGistConfig } from '$lib/gistUtils';

	const dispatch = createEventDispatcher();

	export let mode: 'save' | 'load' = 'save';

	let token = '';
	let gistId = '';
	let description = '';
	let loading = false;
	let error = '';

	const config = loadGistConfig();
	if (config.token) token = config.token;
	if (config.gistId) gistId = config.gistId;

	async function handleSave() {
		if (!token) {
			error = 'GitHub token is required';
			return;
		}

		loading = true;
		error = '';

		try {
			if (gistId) {
				await updateGist($character, token, gistId);
				alert('Character updated in Gist successfully!');
			} else {
				const newGistId = await saveToGist($character, token, description);
				gistId = newGistId;
				alert(`Character saved to Gist! ID: ${newGistId}`);
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
		if (!gistId) {
			error = 'Gist ID is required';
			return;
		}

		loading = true;
		error = '';

		try {
			const loaded = await loadFromGist(gistId, token || undefined);
			character.set(loaded);
			
			saveGistConfig({ token, gistId });
			alert('Character loaded from Gist successfully!');
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

<div class="modal-overlay" on:click={close} on:keydown={(e) => e.key === 'Escape' && close()} role="button" tabindex="-1">
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
					GitHub Token (optional for public gists)
					<a href="https://github.com/settings/tokens" target="_blank" rel="noopener">Get token</a>
				</label>
				<input
					type="password"
					id="token"
					bind:value={token}
					placeholder="ghp_xxxxxxxxxxxxx"
					disabled={loading}
				/>
			</div>

			{#if mode === 'save'}
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

				<div class="form-group">
					<label for="description">Description</label>
					<input
						type="text"
						id="description"
						bind:value={description}
						placeholder="D&D Character Sheet"
						disabled={loading}
					/>
				</div>
			{:else}
				<div class="form-group">
					<label for="gistId">Gist ID *</label>
					<input
						type="text"
						id="gistId"
						bind:value={gistId}
						placeholder="Enter Gist ID"
						disabled={loading}
						required
					/>
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
</style>
