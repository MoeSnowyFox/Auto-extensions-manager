import optionsStorage, { matchOptions } from './options-storage';

chrome.storage.onChanged.addListener(async (changes, areaName) => {
	if (areaName === 'sync' && 'options' in changes) {
		matchOptions();
	}
});

// Must be registered on the top level
chrome.action.onClicked.addListener(async () => {
	const { position } = await optionsStorage.getAll();

	// 'popup' and 'sidebar' are handled by the browser

	if (position === 'tab') {
		chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
		return;
	}

	if (position === 'window') {
		const width = 420;
		const height = 600;
		const currentWindow = await chrome.windows.getCurrent();
		await chrome.windows.create({
			type: 'popup',
			url: chrome.runtime.getURL('index.html?auto-fit=true'),
			width,
			height,
			top: currentWindow.top! + Math.round((currentWindow.height! - height) / 2),
			left: currentWindow.left! + Math.round((currentWindow.width! - width) / 2),
		});
	}
});

matchOptions();

// DEVELOPMENT MODE: uncomment this so the tab will reopen on extension reload
// chrome.tabs.create({url: chrome.runtime.getURL('index.html')});
