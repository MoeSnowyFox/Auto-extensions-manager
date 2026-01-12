/**
 * Auto-fit window to content for popup window mode.
 *
 * Strategy: Wait for content to render, fit window ONCE, then stop.
 * User has full control over window size after initialization.
 */

const MIN_WIDTH = 350;
const MAX_WIDTH = 800;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 900;
const SCROLLBAR_WIDTH = 17;

/** Clamp value within range */
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export default function fitWindow(): void {
	function doFit(): void {
		const chromeWidth = Math.max(0, Math.min(50, window.outerWidth - window.innerWidth));
		const chromeHeight = Math.max(0, Math.min(50, window.outerHeight - window.innerHeight));

		const contentWidth = document.body.scrollWidth;
		const contentHeight = document.body.scrollHeight;

		const targetWidth = clamp(contentWidth + chromeWidth + SCROLLBAR_WIDTH, MIN_WIDTH, MAX_WIDTH);
		const targetHeight = clamp(contentHeight + chromeHeight, MIN_HEIGHT, MAX_HEIGHT);

		window.resizeTo(targetWidth, targetHeight);
	}

	// Wait for extension list to render (#ext-list has children)
	const extList = document.getElementById('ext-list');
	if (extList && extList.children.length > 0) {
		doFit();
		return;
	}

	// Observe DOM until content is ready
	const observer = new MutationObserver(() => {
		const list = document.getElementById('ext-list');
		if (list && list.children.length > 0) {
			observer.disconnect();
			// Wait one frame for layout to settle
			requestAnimationFrame(doFit);
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });
}
