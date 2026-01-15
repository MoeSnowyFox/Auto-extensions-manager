<script lang="ts">
	import type {ExtensionInfo} from './lib/types';
	import {onMount} from 'svelte';
	import Extension from './extension.svelte';
	import {replaceModifierIfMac} from './lib/cmd-key';
	import {focusNext, focusPrevious} from './lib/focus-next';
	import prepareExtensionList, {
		removeImmutableExtension,
	} from './lib/prepare-extension-list';
	import UndoStack from './lib/undo-stack';
	import optionsStorage, {togglePin} from './options-storage';
	import {setExtensionEnabledSafe} from './lib/management';

	const getI18N = chrome.i18n.getMessage;
	const undoStack = new UndoStack(window);

	let extensions = $state<ExtensionInfo[]>([]);
	let searchValue = $state('');

	const options = optionsStorage.getAll();
	let showExtras = $state(false);
	let showStickyInfoMessage = $state(
		!localStorage.getItem('sticky-info-message'),
	);
	let showInfoMessage = $state(!localStorage.getItem('undo-info-message'));
	let userClickedHideInfoMessage = $state(false); // "Disable/enable all" shows the button again, unless the user clicked already "hide" in the current session

	options.then(({showButtons, position}) => {
		if (showButtons === 'always') {
			showExtras = true;
		}

		// Set mode class on body for CSS styling
		document.body.classList.add(`mode-${position}`);
	});

	$effect(() => {
		const keywords = searchValue
			.toLowerCase()
			.split(' ')
			.filter(s => s.length);
		for (const extension of extensions) {
			extension.shown = keywords.every(word =>
				extension.indexedName.includes(word),
			);
		}
	});

	function hideInfoMessage() {
		localStorage.setItem('undo-info-message', String(Date.now()));
		showInfoMessage = false;
		userClickedHideInfoMessage = true;
	}

	function hideStickyInfoMessage() {
		localStorage.setItem('sticky-info-message', String(Date.now()));
		showStickyInfoMessage = false;
	}

	function keyboardNavigationHandler(event: KeyboardEvent) {
		switch (event.key) {
			case 'Tab':
				showExtras = true;
				break;

			case 'ArrowDown':
				focusNext('.ext-name, [type="search"]');
				event.preventDefault();
				break;

			case 'ArrowUp':
				focusPrevious('.ext-name, [type="search"]');
				event.preventDefault();
				break;

			default:
				return;
		}

		document.body.classList.add('keyboard-navigation');
	}

	function toggleAll(enable: boolean) {
		const affectedExtensions = extensions.filter(
			extension =>
				enable !== extension.enabled && extension.mayDisable === true,
		);

		undoStack.do(async toggle => {
			for (const extension of affectedExtensions) {
				const ok = await setExtensionEnabledSafe(
					extension.id,
					enable ? toggle : !toggle,
					{swallow: true},
				);
				if (!ok) {
					extension.mayDisable = false;
				}
			}
		});
	}

	function handleUninstalled(deleted: string) {
		extensions = extensions.filter(({id}) => id !== deleted);
	}

	async function handleInstalled(installed: chrome.management.ExtensionInfo) {
		if (installed.type === 'extension') {
			removeImmutableExtension(installed.id); // Maybe it was updated or reinstalled and is now fixable
			prepare();
		}
	}

	function handleEnabled(updated: chrome.management.ExtensionInfo) {
		const extension = extensions.find(({id}) => id === updated.id);
		if (extension) {
			extension.enabled = true;
		}
	}

	function handleDisabled(updated: chrome.management.ExtensionInfo) {
		const extension = extensions.find(({id}) => id === updated.id);
		if (extension) {
			extension.enabled = false;
		}
	}

	async function prepare() {
		extensions = await prepareExtensionList(await chrome.management.getAll());
	}

	async function handlePin(extensionId: string): Promise<boolean> {
		const wasPinned = await togglePin(extensionId);
		await prepare(); // Refresh the list to show new order
		return wasPinned;
	}

	onMount(() => {
		prepare();

		// Add listeners
		chrome.management.onUninstalled.addListener(handleUninstalled);
		chrome.management.onInstalled.addListener(handleInstalled);
		chrome.management.onEnabled.addListener(handleEnabled);
		chrome.management.onDisabled.addListener(handleDisabled);
		window.addEventListener('blur', prepare);

		// Cleanup function
		return () => {
			chrome.management.onUninstalled.removeListener(handleUninstalled);
			chrome.management.onInstalled.removeListener(handleInstalled);
			chrome.management.onEnabled.removeListener(handleEnabled);
			chrome.management.onDisabled.removeListener(handleDisabled);
			window.removeEventListener('blur', prepare);
		};
	});

	// Toggle extra buttons on right click on the name
	// After the first click, allow the native context menu
	function onContextMenu(event: MouseEvent) {
		if (!showExtras) {
			showExtras = true;
			event.preventDefault();
		}
	}

	function handleBurger(event: Event) {
		const select = event.target as HTMLSelectElement;
		switch (select.value) {
			case 'enable': {
				toggleAll(true);
				showInfoMessage = true;
				break;
			}

			case 'disable': {
				toggleAll(false);
				showInfoMessage = true;
				break;
			}

			case 'extensions': {
				chrome.tabs.create({url: 'chrome://extensions'});
				break;
			}

			case 'options': {
				chrome.runtime.openOptionsPage();
				break;
			}

			default:
		}

		select.value = ''; // Reset the select. PreventDefault doesn't work
	}
</script>

<svelte:window onkeydown={keyboardNavigationHandler} />
<main>
	{#if showInfoMessage && !userClickedHideInfoMessage}
		<p class="notice">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- Static -->
			{@html replaceModifierIfMac(getI18N('undoInfoMsg'), 'z')}
			<a class="hide-action" href="#hide" onclick={hideInfoMessage}
				>{getI18N('hideInfoMsg')}</a
			>
		</p>
	{/if}
	{#if showStickyInfoMessage}
		<p class="notice">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- Static -->
			{@html replaceModifierIfMac(getI18N('stickyInfoMsg'), '')}
			<a class="hide-action" href="#hide" onclick={hideStickyInfoMessage}
				>{getI18N('hideInfoMsg')}</a
			>
		</p>
	{/if}
	<div class="header">
		<!-- svelte-ignore a11y_autofocus -->
		<input
			autofocus
			placeholder={getI18N('searchTxt')}
			bind:value={searchValue}
			type="search"
		/>
		<select class="header-burger" onchange={handleBurger}>
			<option value="">…</option>
			<option value="options">{getI18N('gotoOpt')}</option>
			<option value="extensions">{getI18N('manage')}</option>
			<option value="disable">{getI18N('disAll')}</option>
			<option value="enable">{getI18N('enableAll')}</option>
		</select>
	</div>
	<ul id="ext-list">
		{#each extensions as extension (extension.id)}
			{#if extension.shown}
				<Extension
					{...extension}
					bind:enabled={extension.enabled}
					bind:showExtras
					mayDisable={extension.mayDisable}
					oncontextmenu={onContextMenu}
					onpin={() => handlePin(extension.id)}
					{undoStack}
				/>
			{/if}
		{/each}
	</ul>
</main>
