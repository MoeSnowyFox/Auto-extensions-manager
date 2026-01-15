import type {Options as WebextOptions} from 'webext-options-sync';
import type {ProfileGroup, StoredOptions} from './lib/types';
import OptionsSync from 'webext-options-sync';

type StorageOptions = StoredOptions & WebextOptions;

const optionsStorage = new OptionsSync<StorageOptions>({
	defaults: {
		position: 'popup',
		showButtons: 'on-demand', // Or 'always'
		pinnedExtensions: '[]', // JSON stringified array of pinned extension IDs
		profileGroups: '[]', // JSON stringified array of profile groups
		profilesEnabled: true, // Profile groups enabled by default
	} as StorageOptions,
	migrations: [
		// Remove keys that are no longer supported
		(savedOptions: StorageOptions) => {
			delete (savedOptions as StoredOptions).width;
			delete (savedOptions as StoredOptions).maxWidth;
		},
		// Remove any option that isn't in defaults (cleanup)
		OptionsSync.migrations.removeUnused,
		// Migration to add pinnedExtensions if it doesn't exist
		(options: StorageOptions) => {
			if (!options.pinnedExtensions) {
				options.pinnedExtensions = '[]';
			}
		},
		// Migration to add profileGroups if it doesn't exist
		(options: StorageOptions) => {
			if (!options.profileGroups) {
				options.profileGroups = '[]';
			}
			if (options.profilesEnabled === undefined) {
				options.profilesEnabled = true;
			}
		},
	],
});

export default optionsStorage;

// Helper function to parse pinnedExtensions from JSON string
export function getPinnedExtensions(options: StoredOptions): string[] {
	try {
		return JSON.parse(options.pinnedExtensions) as string[];
	} catch {
		return [];
	}
}

// Helper functions for managing pinned extensions
export async function togglePin(extensionId: string): Promise<boolean> {
	const options = (await optionsStorage.getAll()) as StoredOptions;
	const pinnedExtensions = getPinnedExtensions(options);
	const index = pinnedExtensions.indexOf(extensionId);

	if (index > -1) {
		// Unpin
		pinnedExtensions.splice(index, 1);
	} else {
		// Pin
		pinnedExtensions.push(extensionId);
	}

	await optionsStorage.set({
		pinnedExtensions: JSON.stringify(pinnedExtensions),
	});
	return index === -1; // Return true if pinned, false if unpinned
}

const defaultPopup = chrome.runtime.getManifest().action?.default_popup ?? '';

export async function matchOptions(): Promise<void> {
	const {position} = (await optionsStorage.getAll()) as StoredOptions;
	chrome.action.setPopup({popup: position === 'popup' ? defaultPopup : ''});

	const inSidebar = position === 'sidebar';
	chrome.sidePanel.setOptions({enabled: inSidebar});
	chrome.sidePanel.setPanelBehavior({
		openPanelOnActionClick: inSidebar,
	});
}

// ============================================
// Profile Group Management Functions
// ============================================

/**
 * Get all profile groups from storage
 */
export function getProfileGroups(options: StoredOptions): ProfileGroup[] {
	try {
		return JSON.parse(options.profileGroups) as ProfileGroup[];
	} catch {
		return [];
	}
}

/**
 * Save profile groups to storage
 */
export async function saveProfileGroups(
	profileGroups: ProfileGroup[],
): Promise<void> {
	await optionsStorage.set({profileGroups: JSON.stringify(profileGroups)});
}

/**
 * Add a new profile group
 */
export async function addProfileGroup(
	profileGroup: ProfileGroup,
): Promise<void> {
	const options = (await optionsStorage.getAll()) as StoredOptions;
	const profileGroups = getProfileGroups(options);
	profileGroups.push(profileGroup);
	await saveProfileGroups(profileGroups);
}

/**
 * Update an existing profile group
 */
export async function updateProfileGroup(
	profileGroup: ProfileGroup,
): Promise<void> {
	const options = (await optionsStorage.getAll()) as StoredOptions;
	const profileGroups = getProfileGroups(options);
	const index = profileGroups.findIndex(p => p.id === profileGroup.id);
	if (index !== -1) {
		profileGroups[index] = {...profileGroup, updatedAt: Date.now()};
		await saveProfileGroups(profileGroups);
	}
}

/**
 * Delete a profile group by ID
 */
export async function deleteProfileGroup(profileId: string): Promise<void> {
	const options = (await optionsStorage.getAll()) as StoredOptions;
	const profileGroups = getProfileGroups(options);
	const filtered = profileGroups.filter(p => p.id !== profileId);
	await saveProfileGroups(filtered);
}

/**
 * Toggle profile group enabled state
 */
export async function toggleProfileGroup(profileId: string): Promise<boolean> {
	const options = (await optionsStorage.getAll()) as StoredOptions;
	const profileGroups = getProfileGroups(options);
	const profile = profileGroups.find(p => p.id === profileId);
	if (profile) {
		profile.enabled = !profile.enabled;
		profile.updatedAt = Date.now();
		await saveProfileGroups(profileGroups);
		return profile.enabled;
	}
	return false;
}

/**
 * Get the global enabled state for profile groups
 */
export async function getProfilesEnabled(): Promise<boolean> {
	const options = (await optionsStorage.getAll()) as StoredOptions;
	return options.profilesEnabled ?? true;
}

/**
 * Set the global enabled state for profile groups
 */
export async function setProfilesEnabled(enabled: boolean): Promise<void> {
	await optionsStorage.set({profilesEnabled: enabled});
}
