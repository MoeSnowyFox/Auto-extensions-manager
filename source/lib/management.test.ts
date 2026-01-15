// eslint-disable-next-line ts/ban-ts-comment
// @ts-expect-error
import assert from 'node:assert/strict';
// eslint-disable-next-line ts/ban-ts-comment
// @ts-expect-error
import {describe, it} from 'node:test';

import {setExtensionEnabledSafe} from './management';

describe('setExtensionEnabledSafe', () => {
	it('returns false when swallow=true and runtime.lastError is set', async () => {
		const previousChrome = (globalThis as any).chrome;
		try {
			(globalThis as any).chrome = {
				runtime: {
					lastError: undefined,
				},
				management: {
					setEnabled: (_id: string, _enabled: boolean, cb: () => void) => {
						(globalThis as any).chrome.runtime.lastError = {
							message: 'cannot be modified by user',
						};
						cb();
					},
				},
			};

			const ok = await setExtensionEnabledSafe('x', true, {swallow: true});
			assert.equal(ok, false);
		} finally {
			(globalThis as any).chrome = previousChrome;
		}
	});

	it('throws when swallow=false and runtime.lastError is set', async () => {
		const previousChrome = (globalThis as any).chrome;
		try {
			(globalThis as any).chrome = {
				runtime: {
					lastError: undefined,
				},
				management: {
					setEnabled: (_id: string, _enabled: boolean, cb: () => void) => {
						(globalThis as any).chrome.runtime.lastError = {
							message: 'cannot be modified by user',
						};
						cb();
					},
				},
			};

			await assert.rejects(
				() => setExtensionEnabledSafe('x', true),
				/cannot be modified by user/i,
			);
		} finally {
			(globalThis as any).chrome = previousChrome;
		}
	});
});
