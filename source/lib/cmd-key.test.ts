import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

async function loadModuleWithPlatform(platform: string) {
	// Stub global navigator.platform before importing the module.
	Object.defineProperty(navigator, 'platform', {
		value: platform,
		configurable: true,
	});
	// Dynamic import with a cache-busting query so module-level detection is re-evaluated.
	const url = new URL(`./cmd-key.ts?cb=${Date.now()}`, import.meta.url);
	return import(url.href);
}

describe('replaceModifierIfMac', () => {
	it('non-Mac: returns original string unchanged', async () => {
		const mod = await loadModuleWithPlatform('Win32');
		const input = '<kbd>Ctrl+Z</kbd>';
		assert.strictEqual(mod.replaceModifierIfMac(input, 'z'), input);
	});

	it('Mac: replaces "<kbd>Ctrl+Z</kbd>" with "⌘Z"', async () => {
		const mod = await loadModuleWithPlatform('MacIntel');
		assert.strictEqual(
			mod.replaceModifierIfMac('<kbd>Ctrl+Z</kbd>', 'z'),
			'<kbd>⌘Z</kbd>',
		);
	});

	it('Mac: replacement is case-insensitive ("ctrl+z" -> "⌘Z")', async () => {
		const mod = await loadModuleWithPlatform('Macintosh');
		assert.strictEqual(
			mod.replaceModifierIfMac('<kbd>ctrl+z</kbd>', 'z'),
			'<kbd>⌘Z</kbd>',
		);
	});
});

describe('isHoldingModifier', () => {
	it('non-Mac: returns true if ctrlKey is held', async () => {
		const mod = await loadModuleWithPlatform('Win32');
		assert.strictEqual(mod.isHoldingModifier({ ctrlKey: true, metaKey: false }), true);
		assert.strictEqual(mod.isHoldingModifier({ ctrlKey: false, metaKey: true }), false);
	});

	it('Mac: returns true if metaKey is held', async () => {
		const mod = await loadModuleWithPlatform('MacIntel');
		assert.strictEqual(mod.isHoldingModifier({ ctrlKey: true, metaKey: false }), false);
		assert.strictEqual(mod.isHoldingModifier({ ctrlKey: false, metaKey: true }), true);
	});
});
