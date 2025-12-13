export interface ExtensionInfo extends chrome.management.ExtensionInfo {
	shown: boolean;
	indexedName: string;
	isPinned: boolean;
}

export interface Options {
	[key: string]: unknown;
	position: 'popup' | 'tab' | 'window' | 'sidebar';
	showButtons: 'on-demand' | 'always';
	width: string;
	pinnedExtensions: string[];
}

export type ToggleFunction = (toggle: boolean) => void;

