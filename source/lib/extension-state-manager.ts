/**
 * Extension State Manager
 *
 * Manages saving and restoring extension enabled/disabled states
 * when switching between profile groups.
 */

import type {
	ExtensionStateConfig,
	ProfileGroup,
	ProfileMatchState,
	SavedExtensionState,
} from './types';
import {setExtensionEnabledSafe} from './management';

// In-memory state tracking
let currentState: ProfileMatchState = {
	activeProfileId: null,
	savedStates: [],
	lastMatchedUrl: null,
};

/**
 * Get current profile match state
 */
export function getCurrentState(): ProfileMatchState {
	return {...currentState};
}

/**
 * Save current extension states before applying a profile
 * Only saves states for extensions that will be modified
 */
export async function saveCurrentStates(
	extensionConfigs: ExtensionStateConfig[],
): Promise<SavedExtensionState[]> {
	const extensionsToSave = extensionConfigs
		.filter(config => config.targetState !== 'keep')
		.map(config => config.extensionId);

	if (extensionsToSave.length === 0) {
		return [];
	}

	const allExtensions = await chrome.management.getAll();
	const savedStates: SavedExtensionState[] = [];

	for (const extId of extensionsToSave) {
		const ext = allExtensions.find(e => e.id === extId);
		if (ext) {
			savedStates.push({
				extensionId: extId,
				wasEnabled: ext.enabled,
			});
		}
	}

	return savedStates;
}

/**
 * Apply a profile's extension states
 */
export async function applyProfileStates(
	profile: ProfileGroup,
	url: string,
): Promise<void> {
	// If we already have an active profile and it's different, restore first
	if (
		currentState.activeProfileId &&
		currentState.activeProfileId !== profile.id
	) {
		await restoreOriginalStates();
	}

	// If this profile is already active, skip
	if (currentState.activeProfileId === profile.id) {
		currentState.lastMatchedUrl = url;
		return;
	}

	// Save current states before modifying
	const savedStates = await saveCurrentStates(profile.extensionStates);

	// Apply the profile's extension states
	const results: Array<{id: string; success: boolean}> = [];

	for (const config of profile.extensionStates) {
		if (config.targetState === 'keep') {
			continue;
		}

		const targetEnabled = config.targetState === 'enable';
		const success = await setExtensionEnabledSafe(
			config.extensionId,
			targetEnabled,
			{swallow: true},
		);
		results.push({id: config.extensionId, success});
	}

	// Update state tracking
	currentState = {
		activeProfileId: profile.id,
		savedStates,
		lastMatchedUrl: url,
	};

	console.log('[Profile Manager] Applied profile:', {
		profileName: profile.name,
		profileId: profile.id,
		url,
		results,
	});
}

/**
 * Restore original extension states when leaving a matched URL
 */
export async function restoreOriginalStates(): Promise<void> {
	if (!currentState.activeProfileId || currentState.savedStates.length === 0) {
		// Nothing to restore
		currentState = {
			activeProfileId: null,
			savedStates: [],
			lastMatchedUrl: null,
		};
		return;
	}

	console.log('[Profile Manager] Restoring original states:', {
		previousProfileId: currentState.activeProfileId,
		stateCount: currentState.savedStates.length,
	});

	// Restore each extension to its previous state
	for (const saved of currentState.savedStates) {
		await setExtensionEnabledSafe(saved.extensionId, saved.wasEnabled, {
			swallow: true,
		});
	}

	// Clear state
	currentState = {
		activeProfileId: null,
		savedStates: [],
		lastMatchedUrl: null,
	};
}

/**
 * Check if a URL should trigger state restoration
 * (i.e., the new URL doesn't match the currently active profile)
 */
export function shouldRestoreStates(
	newUrl: string,
	matchingProfile: ProfileGroup | null,
): boolean {
	// No active profile means nothing to restore
	if (!currentState.activeProfileId) {
		return false;
	}

	// If no matching profile for the new URL, restore
	if (!matchingProfile) {
		return true;
	}

	// If the matching profile is different from the active one, restore
	return matchingProfile.id !== currentState.activeProfileId;
}

/**
 * Clear all state (for testing or reset)
 */
export function clearState(): void {
	currentState = {
		activeProfileId: null,
		savedStates: [],
		lastMatchedUrl: null,
	};
}
