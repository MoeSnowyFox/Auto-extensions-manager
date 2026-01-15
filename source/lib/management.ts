/**
 * Small wrappers around chrome.management APIs.
 *
 * Why: In MV3 these APIs are callback-first and errors often surface via
 * chrome.runtime.lastError rather than Promise rejection. Some environments also
 * expose Promise-like returns. This wrapper normalizes both and prevents
 * "Uncaught (in promise)" from leaking.
 */

export async function setExtensionEnabledSafe(
	id: string,
	enabled: boolean,
	options: {swallow?: boolean} = {},
): Promise<boolean> {
	const swallow = options.swallow ?? false;

	try {
		// Prefer callback form so we can reliably read runtime.lastError.
		await new Promise<void>((resolve, reject) => {
			try {
				chrome.management.setEnabled(id, enabled, () => {
					const err = chrome.runtime.lastError;
					if (err) {
						reject(new Error(err.message));
						return;
					}
					resolve();
				});
			} catch (e) {
				reject(e);
			}
		});
		return true;
	} catch (e) {
		if (swallow) {
			return false;
		}
		// Re-throw original error (normalized as Error)
		throw e instanceof Error ? e : new Error(String(e));
	}
}
