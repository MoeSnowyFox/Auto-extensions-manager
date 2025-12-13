export default function preventMultipleWindows(): void {
	chrome.runtime.sendMessage('thisTownIsTooSmallForTheTwoOfUs').catch(() => {
		// No other windows open, good!
	});
	chrome.runtime.onMessage.addListener((message: unknown) => {
		if (message === 'thisTownIsTooSmallForTheTwoOfUs') {
			window.close();
		}
	});
}

