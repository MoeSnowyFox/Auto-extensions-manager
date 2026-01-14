import type { ExtensionInfo } from './types';
import optionsStorage, { getPinnedExtensions } from '../options-storage';

const IMMUTABLE_CACHE_KEY = 'immutable-extensions-cache';

export function getImmutableExtensions(): string[] {
	try {
		return JSON.parse(localStorage.getItem(IMMUTABLE_CACHE_KEY) || '[]');
	} catch {
		return [];
	}
}

export function addImmutableExtension(id: string): void {
	const list = getImmutableExtensions();
	if (!list.includes(id)) {
		list.push(id);
		localStorage.setItem(IMMUTABLE_CACHE_KEY, JSON.stringify(list));
	}
}

export function removeImmutableExtension(id: string): void {
	const list = getImmutableExtensions();
	const index = list.indexOf(id);
	if (index !== -1) {
		list.splice(index, 1);
		localStorage.setItem(IMMUTABLE_CACHE_KEY, JSON.stringify(list));
	}
}

/**
 * Enhances the raw Chrome extension info with additional properties
 * @param extension - The raw Chrome extension info
 * @param isPinned - Whether the extension is pinned by user
 * @param isImmutable - Whether the extension is known to be immutable (from cache)
 * @returns Enhanced extension info with additional properties
 */
function enhanceExtensionInfo(
	extension: chrome.management.ExtensionInfo,
	isPinned: boolean = false,
	isImmutable: boolean = false,
): ExtensionInfo {
	return {
		...extension,
		shown: true,
		indexedName: extension.name.toLowerCase(),
		isPinned,
		mayDisable: extension.mayDisable && !isImmutable,
	};
}

/**
 * Sorts extensions by pinned status, enabled status, and name
 * @param extensions - Array of extensions to sort
 * @param pinnedExtensions - Array of pinned extension IDs
 * @returns Sorted array of extensions
 */
export function sortExtensions<T extends chrome.management.ExtensionInfo>(
	extensions: T[],
	pinnedExtensions: string[],
): T[] {
	return [...extensions].sort((a, b) => {
		const aPinned = pinnedExtensions.includes(a.id);
		const bPinned = pinnedExtensions.includes(b.id);

		// First sort by pinned status
		if (aPinned !== bPinned) {
			return bPinned ? 1 : -1; // Pinned extensions first
		}

		// If both are pinned or both are not pinned, sort by enabled status
		if (a.enabled === b.enabled) {
			return a.name.localeCompare(b.name); // Sort by name
		}

		return a.enabled < b.enabled ? 1 : -1; // Enabled extensions first
	});
}

/**
 * Prepares the extension list by filtering, enhancing, and sorting
 * @param extensions - Raw Chrome extension info array
 * @returns Promise resolving to enhanced and sorted extension info array
 */
export default async function prepareExtensionList(extensions: chrome.management.ExtensionInfo[]): Promise<ExtensionInfo[]> {
	const options = await optionsStorage.getAll();
	const pinnedExtensions = getPinnedExtensions(options);

	// Filter out non-extensions and self
	const filteredExtensions = extensions.filter(
		({ type, id }) => type === 'extension' && id !== chrome.runtime.id,
	);

	// Sort extensions
	const sortedExtensions = sortExtensions(filteredExtensions, pinnedExtensions);
	const immutableExtensions = getImmutableExtensions();

	// Enhance with additional properties
	return sortedExtensions.map(extension =>
		enhanceExtensionInfo(
			extension,
			pinnedExtensions.includes(extension.id),
			immutableExtensions.includes(extension.id),
		),
	);
}
