<script lang="ts">
	import type {
		ExtensionStateConfig,
		ExtensionTargetState,
		MatchCondition,
		MatchType,
		ProfileGroup,
	} from '../lib/types';
	import {onMount} from 'svelte';
	import optionsStorage, {
		addProfileGroup,
		deleteProfileGroup,
		getProfileGroups,
		saveProfileGroups,
		updateProfileGroup,
	} from '../options-storage';
	import {
		createMatchCondition,
		createProfileGroup,
		validatePattern,
	} from '../lib/url-matcher';
	import pickBestIcon from '../lib/icons';

	interface IconInfo {
		size: number;
		url: string;
	}

	interface ExtensionWithState {
		id: string;
		name: string;
		icons?: IconInfo[];
		targetState: ExtensionTargetState;
	}

	const getI18N = chrome.i18n.getMessage;

	let profiles = $state<ProfileGroup[]>([]);
	let globalEnabled = $state(true);
	let extensions = $state<chrome.management.ExtensionInfo[]>([]);

	// Editor state
	let isEditing = $state(false);
	let editingProfile = $state<ProfileGroup | null>(null);
	let editorName = $state('');
	let editorPriority = $state(0);
	let editorConditions = $state<MatchCondition[]>([]);
	let editorExtensionStates = $state<ExtensionWithState[]>([]);
	let validationErrors = $state<Record<string, string>>({});

	async function loadData(): Promise<void> {
		const options = await optionsStorage.getAll();
		profiles = getProfileGroups(options);
		globalEnabled = options.profilesEnabled ?? true;

		// Load extensions
		const allExtensions = await chrome.management.getAll();
		extensions = allExtensions.filter(
			ext =>
				ext.type === 'extension' &&
				ext.id !== chrome.runtime.id &&
				ext.name !== 'One-Click Extensions Manager',
		);
	}

	onMount(() => {
		loadData();
	});

	async function handleGlobalToggle(): Promise<void> {
		globalEnabled = !globalEnabled;
		await optionsStorage.set({profilesEnabled: globalEnabled});
	}

	function startNewProfile(): void {
		editingProfile = null;
		editorName = '';
		editorPriority = profiles.length;
		editorConditions = [];
		editorExtensionStates = extensions.map(ext => ({
			id: ext.id,
			name: ext.name,
			icons: ext.icons,
			targetState: 'keep' as ExtensionTargetState,
		}));
		validationErrors = {};
		isEditing = true;
	}

	function startEditProfile(profile: ProfileGroup): void {
		editingProfile = profile;
		editorName = profile.name;
		editorPriority = profile.priority;
		editorConditions = [...profile.conditions];

		// Map extension states, using 'keep' as default for extensions not in the profile
		const stateMap = new Map(
			profile.extensionStates.map(s => [s.extensionId, s.targetState]),
		);
		editorExtensionStates = extensions.map(ext => ({
			id: ext.id,
			name: ext.name,
			icons: ext.icons,
			targetState: stateMap.get(ext.id) ?? ('keep' as ExtensionTargetState),
		}));

		validationErrors = {};
		isEditing = true;
	}

	function cancelEdit(): void {
		isEditing = false;
		editingProfile = null;
		validationErrors = {};
	}

	function addCondition(): void {
		editorConditions = [
			...editorConditions,
			createMatchCondition('host-wildcard', ''),
		];
	}

	function removeCondition(index: number): void {
		editorConditions = editorConditions.filter((_, i) => i !== index);
	}

	function updateConditionType(index: number, type: MatchType): void {
		editorConditions[index] = {...editorConditions[index], type};
	}

	function updateConditionPattern(index: number, pattern: string): void {
		editorConditions[index] = {...editorConditions[index], pattern};
		// Clear validation error when user types
		delete validationErrors[`condition-${index}`];
	}

	function updateExtensionState(
		extId: string,
		state: ExtensionTargetState,
	): void {
		const ext = editorExtensionStates.find(e => e.id === extId);
		if (ext) {
			ext.targetState = state;
		}
	}

	function validateForm(): boolean {
		validationErrors = {};

		if (!editorName.trim()) {
			validationErrors['name'] =
				getI18N('profileNameRequired') || 'Profile name is required';
		}

		if (editorConditions.length === 0) {
			validationErrors['conditions'] =
				getI18N('atLeastOneCondition') || 'At least one condition is required';
		}

		editorConditions.forEach((condition, index) => {
			const error = validatePattern(condition.pattern, condition.type);
			if (error) {
				validationErrors[`condition-${index}`] = error;
			}
		});

		return Object.keys(validationErrors).length === 0;
	}

	async function saveProfile(): Promise<void> {
		if (!validateForm()) {
			return;
		}

		const extensionStates: ExtensionStateConfig[] = editorExtensionStates
			.filter(e => e.targetState !== 'keep')
			.map(e => ({
				extensionId: e.id,
				targetState: e.targetState,
			}));

		if (editingProfile) {
			// Update existing profile
			const updated: ProfileGroup = {
				...editingProfile,
				name: editorName.trim(),
				priority: editorPriority,
				conditions: editorConditions,
				extensionStates,
				updatedAt: Date.now(),
			};
			await updateProfileGroup(updated);
		} else {
			// Create new profile
			const newProfile = createProfileGroup(editorName.trim(), editorPriority);
			newProfile.conditions = editorConditions;
			newProfile.extensionStates = extensionStates;
			await addProfileGroup(newProfile);
		}

		await loadData();
		isEditing = false;
		editingProfile = null;
	}

	async function handleDeleteProfile(profileId: string): Promise<void> {
		if (
			confirm(
				getI18N('confirmDeleteProfile') ||
					'Are you sure you want to delete this profile?',
			)
		) {
			await deleteProfileGroup(profileId);
			await loadData();
		}
	}

	async function handleToggleProfile(profile: ProfileGroup): Promise<void> {
		profile.enabled = !profile.enabled;
		await updateProfileGroup(profile);
		await loadData();
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString();
	}

	function getMatchTypeLabel(type: MatchType): string {
		switch (type) {
			case 'host-wildcard':
				return getI18N('hostWildcard') || 'Host Wildcard';
			case 'url-wildcard':
				return getI18N('urlWildcard') || 'URL Wildcard';
			case 'regex':
				return getI18N('regex') || 'Regex';
			default:
				return type;
		}
	}
</script>

<main>
	<a href="../options/options.html" class="back-link"
		>← {getI18N('backToOptions') || 'Back to Options'}</a
	>

	<h1>{getI18N('profileGroups') || 'Profile Groups'}</h1>

	<div class="global-toggle">
		<label class="toggle-switch">
			<input
				type="checkbox"
				id="global-toggle"
				checked={globalEnabled}
				onchange={handleGlobalToggle}
			/>
			<span class="slider"></span>
		</label>
		<label for="global-toggle"
			>{getI18N('enableProfileGroups') || 'Enable Profile Groups'}</label
		>
	</div>

	{#if !isEditing}
		<!-- Profile List View -->
		{#if profiles.length === 0}
			<div class="empty-state">
				<p>{getI18N('noProfiles') || 'No profile groups configured yet.'}</p>
				<p>
					{getI18N('profilesDescription') ||
						'Profile groups let you automatically enable/disable extensions based on the websites you visit.'}
				</p>
			</div>
		{:else}
			<ul class="profile-list">
				{#each profiles as profile (profile.id)}
					<li class="profile-item" class:disabled={!profile.enabled}>
						<label class="toggle-switch">
							<input
								type="checkbox"
								checked={profile.enabled}
								onchange={() => handleToggleProfile(profile)}
							/>
							<span class="slider"></span>
						</label>
						<div class="profile-info">
							<h3 class="profile-name">{profile.name}</h3>
							<div class="profile-meta">
								{profile.conditions.length}
								{getI18N('conditions') || 'conditions'} •
								{profile.extensionStates.length}
								{getI18N('extensions') || 'extensions'} •
								{getI18N('priority') || 'Priority'}: {profile.priority}
							</div>
						</div>
						<div class="profile-actions">
							<button onclick={() => startEditProfile(profile)}>
								{getI18N('edit') || 'Edit'}
							</button>
							<button
								class="delete"
								onclick={() => handleDeleteProfile(profile.id)}
							>
								{getI18N('delete') || 'Delete'}
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<button class="add-profile-btn" onclick={startNewProfile}>
			+ {getI18N('addProfile') || 'Add New Profile Group'}
		</button>
	{:else}
		<!-- Profile Editor View -->
		<div class="profile-editor">
			<h2>
				{editingProfile
					? getI18N('editProfile') || 'Edit Profile'
					: getI18N('newProfile') || 'New Profile'}
			</h2>

			<div class="form-group">
				<label for="profile-name"
					>{getI18N('profileName') || 'Profile Name'}</label
				>
				<input
					type="text"
					id="profile-name"
					bind:value={editorName}
					placeholder={getI18N('profileNamePlaceholder') ||
						'e.g., Development Sites'}
				/>
				{#if validationErrors.name}
					<div class="validation-error">{validationErrors.name}</div>
				{/if}
			</div>

			<div class="form-group">
				<label for="profile-priority"
					>{getI18N('priority') || 'Priority'} ({getI18N('higherFirst') ||
						'higher = checked first'})</label
				>
				<input
					type="number"
					id="profile-priority"
					bind:value={editorPriority}
					min="0"
					max="100"
				/>
			</div>

			<h2>{getI18N('urlConditions') || 'URL Conditions'}</h2>
			<p class="form-help">
				{getI18N('urlConditionsHelp') ||
					'The profile will be applied when the URL matches ANY of these conditions.'}
			</p>

			{#if validationErrors['conditions']}
				<div class="validation-error">{validationErrors['conditions']}</div>
			{/if}

			<ul class="conditions-list">
				{#each editorConditions as condition, index (condition.id)}
					<li class="condition-item">
						<select
							value={condition.type}
							onchange={e =>
								updateConditionType(
									index,
									(e.target as HTMLSelectElement).value as MatchType,
								)}
						>
							<option value="host-wildcard"
								>{getMatchTypeLabel('host-wildcard')}</option
							>
							<option value="url-wildcard"
								>{getMatchTypeLabel('url-wildcard')}</option
							>
							<option value="regex">{getMatchTypeLabel('regex')}</option>
						</select>
						<input
							type="text"
							value={condition.pattern}
							oninput={e =>
								updateConditionPattern(
									index,
									(e.target as HTMLInputElement).value,
								)}
							placeholder={condition.type === 'host-wildcard'
								? '*.example.com'
								: condition.type === 'url-wildcard'
									? '*://example.com/*'
									: '^https://.*\\.example\\.com/.*$'}
						/>
						<button class="remove" onclick={() => removeCondition(index)}
							>×</button
						>
						{#if validationErrors[`condition-${index}`]}
							<div class="validation-error">
								{validationErrors[`condition-${index}`]}
							</div>
						{/if}
					</li>
				{/each}
			</ul>

			<button class="add-condition-btn" onclick={addCondition}>
				+ {getI18N('addCondition') || 'Add Condition'}
			</button>

			<h2>{getI18N('extensionStates') || 'Extension States'}</h2>
			<p class="form-help">
				{getI18N('extensionStatesHelp') ||
					'Configure how each extension should behave when this profile is active.'}
			</p>

			<div class="extension-states">
				{#each editorExtensionStates as ext (ext.id)}
					<div class="extension-state-item">
						<img src={pickBestIcon(ext.icons, 24)} alt="" />
						<span class="ext-name">{ext.name}</span>
						<select
							value={ext.targetState}
							onchange={e =>
								updateExtensionState(
									ext.id,
									(e.target as HTMLSelectElement).value as ExtensionTargetState,
								)}
						>
							<option value="keep"
								>{getI18N('keepState') || 'Keep current'}</option
							>
							<option value="enable">{getI18N('enable') || 'Enable'}</option>
							<option value="disable">{getI18N('disable') || 'Disable'}</option>
						</select>
					</div>
				{/each}
			</div>

			<div class="editor-actions">
				<button class="cancel" onclick={cancelEdit}>
					{getI18N('cancel') || 'Cancel'}
				</button>
				<button class="save" onclick={saveProfile}>
					{getI18N('save') || 'Save'}
				</button>
			</div>
		</div>
	{/if}
</main>
