export interface ExtensionInfo extends chrome.management.ExtensionInfo {
	shown: boolean;
	indexedName: string;
	isPinned: boolean;
}

// Stored options shape (kept small and stable)
export interface StoredOptions {
	position: 'popup' | 'tab' | 'window' | 'sidebar';
	showButtons: 'on-demand' | 'always';
	pinnedExtensions: string; // JSON stringified array

	// Legacy keys (to be cleaned up by migrations)
	width?: string;
	maxWidth?: string;
}

export type ToggleFunction = (toggle: boolean) => void;
