export interface ExtensionInfo extends chrome.management.ExtensionInfo {
	shown: boolean;
	indexedName: string;
	isPinned: boolean;
	mayDisable: boolean;
}

// Stored options shape (kept small and stable)
export interface StoredOptions {
	position: 'popup' | 'tab' | 'window' | 'sidebar';
	showButtons: 'on-demand' | 'always';
	pinnedExtensions: string; // JSON stringified array
	profileGroups: string; // JSON stringified ProfileGroup[]
	profilesEnabled: boolean; // Global switch for profile groups

	// Legacy keys (to be cleaned up by migrations)
	width?: string;
	maxWidth?: string;
}

export type ToggleFunction = (toggle: boolean) => void | Promise<void>;

// ============================================
// Profile Group Types
// ============================================

/**
 * URL matching condition types
 */
export type MatchType = 'host-wildcard' | 'url-wildcard' | 'regex';

/**
 * URL matching condition
 */
export interface MatchCondition {
	id: string;
	type: MatchType;
	pattern: string;
	enabled: boolean;
}

/**
 * Extension target state in a profile
 */
export type ExtensionTargetState = 'enable' | 'disable' | 'keep';

/**
 * Extension state configuration within a profile
 */
export interface ExtensionStateConfig {
	extensionId: string;
	targetState: ExtensionTargetState;
}

/**
 * Profile group - a set of URL conditions and extension states
 */
export interface ProfileGroup {
	id: string;
	name: string;
	enabled: boolean;
	priority: number;
	conditions: MatchCondition[];
	extensionStates: ExtensionStateConfig[];
	createdAt: number;
	updatedAt: number;
}

/**
 * Saved extension state (for restoration)
 */
export interface SavedExtensionState {
	extensionId: string;
	wasEnabled: boolean;
}

/**
 * Profile matching state tracked in background
 */
export interface ProfileMatchState {
	activeProfileId: string | null;
	savedStates: SavedExtensionState[];
	lastMatchedUrl: string | null;
}
