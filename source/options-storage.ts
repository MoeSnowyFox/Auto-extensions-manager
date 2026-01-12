import type { Options as WebextOptions } from 'webext-options-sync';
import type { StoredOptions } from './lib/types';
import OptionsSync from 'webext-options-sync';

type StorageOptions = StoredOptions & WebextOptions;

const optionsStorage = new OptionsSync<StorageOptions>({
	defaults: {
		position: 'popup',
		showButtons: 'on-demand', // Or 'always'
		pinnedExtensions: '[]', // JSON stringified array of pinned extension IDs
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

	await optionsStorage.set({ pinnedExtensions: JSON.stringify(pinnedExtensions) });
	return index === -1; // Return true if pinned, false if unpinned
}

const defaultPopup = chrome.runtime.getManifest().action?.default_popup ?? '';

export async function matchOptions(): Promise<void> {
	const { position } = (await optionsStorage.getAll()) as StoredOptions;
	chrome.action.setPopup({ popup: position === 'popup' ? defaultPopup : '' });

	const inSidebar = position === 'sidebar';
	chrome.sidePanel.setOptions({ enabled: inSidebar });
	chrome.sidePanel.setPanelBehavior({
		openPanelOnActionClick: inSidebar,
	});
}
