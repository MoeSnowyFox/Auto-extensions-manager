import type {StoredOptions} from './lib/types';
import {
	applyProfileStates,
	getCurrentState,
	restoreOriginalStates,
	shouldRestoreStates,
} from './lib/extension-state-manager';
import {findMatchingProfile} from './lib/url-matcher';
import optionsStorage, {
	getProfileGroups,
	matchOptions,
} from './options-storage';

chrome.storage.onChanged.addListener(async (changes, areaName) => {
	if (areaName === 'sync' && 'options' in changes) {
		matchOptions();
	}
});

// Must be registered on the top level
chrome.action.onClicked.addListener(async () => {
	const {position} = await optionsStorage.getAll();

	// 'popup' and 'sidebar' are handled by the browser

	if (position === 'tab') {
		chrome.tabs.create({url: chrome.runtime.getURL('index.html')});
		return;
	}

	if (position === 'window') {
		// Initial size, fitWindow will adjust to exact content size
		const width = 350;
		const height = 200;
		const currentWindow = await chrome.windows.getCurrent();
		await chrome.windows.create({
			type: 'popup',
			url: chrome.runtime.getURL('index.html?auto-fit=true'),
			width,
			height,
			top:
				currentWindow.top! + Math.round((currentWindow.height! - height) / 2),
			left:
				currentWindow.left! + Math.round((currentWindow.width! - width) / 2),
		});
	}
});

matchOptions();

// ============================================
// Profile Group URL Matching
// ============================================

/**
 * Handle URL navigation and apply matching profile
 */
async function handleNavigation(
	url: string,
	tabId: number,
	frameId: number,
): Promise<void> {
	// Only handle main frame navigations
	if (frameId !== 0) {
		return;
	}

	// Skip chrome:// and extension URLs
	if (
		url.startsWith('chrome://') ||
		url.startsWith('chrome-extension://') ||
		url.startsWith('about:') ||
		url.startsWith('edge://') ||
		url.startsWith('brave://')
	) {
		return;
	}

	try {
		const options = (await optionsStorage.getAll()) as StoredOptions;

		// Check if profiles are enabled globally
		if (!options.profilesEnabled) {
			return;
		}

		const profiles = getProfileGroups(options);
		if (profiles.length === 0) {
			return;
		}

		const matchingProfile = findMatchingProfile(url, profiles);
		const currentState = getCurrentState();

		// Check if we need to restore states (leaving matched area)
		if (shouldRestoreStates(url, matchingProfile)) {
			await restoreOriginalStates();
		}

		// Apply the matching profile if found
		if (matchingProfile) {
			console.log('[Profile Manager] URL matched profile:', {
				url,
				profileName: matchingProfile.name,
				tabId,
			});
			await applyProfileStates(matchingProfile, url);
		} else if (currentState.activeProfileId) {
			// No matching profile but we had an active one - already restored above
			console.log('[Profile Manager] No matching profile for URL:', url);
		}
	} catch (error) {
		console.error('[Profile Manager] Error handling navigation:', error);
	}
}

/**
 * Listen for tab URL changes
 * Using onBeforeNavigate for earliest possible interception
 */
chrome.webNavigation.onBeforeNavigate.addListener(details => {
	handleNavigation(details.url, details.tabId, details.frameId);
});

/**
 * Also listen for committed navigations to catch any missed ones
 */
chrome.webNavigation.onCommitted.addListener(details => {
	// Skip if it's a sub-frame or a same-document navigation
	if (
		details.frameId !== 0 ||
		details.transitionType === 'auto_subframe' ||
		details.transitionType === 'manual_subframe'
	) {
		return;
	}

	handleNavigation(details.url, details.tabId, details.frameId);
});

/**
 * Handle tab activation (switching between tabs)
 */
chrome.tabs.onActivated.addListener(async activeInfo => {
	try {
		const tab = await chrome.tabs.get(activeInfo.tabId);
		if (tab.url) {
			await handleNavigation(tab.url, activeInfo.tabId, 0);
		}
	} catch (error) {
		// Tab might have been closed
		console.debug('[Profile Manager] Error getting activated tab:', error);
	}
});

/**
 * Handle tab URL updates (e.g., single-page app navigation)
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.url && tab.active) {
		handleNavigation(changeInfo.url, tabId, 0);
	}
});

// DEVELOPMENT MODE: uncomment this so the tab will reopen on extension reload
// chrome.tabs.create({url: chrome.runtime.getURL('index.html')});
