/**
 * Auto-fit window to content for popup window mode.
 *
 * Strategy: Fit window ONCE on initial load, then never auto-resize.
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
	function initialFit(): void {
		// Calculate browser chrome size
		const chromeWidth = Math.max(0, Math.min(50, window.outerWidth - window.innerWidth));
		const chromeHeight = Math.max(0, Math.min(50, window.outerHeight - window.innerHeight));

		// Calculate content size
		const contentWidth = document.body.scrollWidth;
		const contentHeight = document.body.scrollHeight;

		// Calculate target size with scrollbar reserved
		const targetWidth = clamp(contentWidth + chromeWidth + SCROLLBAR_WIDTH, MIN_WIDTH, MAX_WIDTH);
		const targetHeight = clamp(contentHeight + chromeHeight, MIN_HEIGHT, MAX_HEIGHT);

		window.resizeTo(targetWidth, targetHeight);
	}

	// Fit once when DOM is ready
	if (document.readyState === 'complete') {
		initialFit();
	} else {
		window.addEventListener('load', initialFit, { once: true });
	}
}
