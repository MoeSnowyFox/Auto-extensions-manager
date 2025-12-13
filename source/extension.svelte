<script lang="ts">
	import type UndoStack from './lib/undo-stack';
	import pickBestIcon from './lib/icons';
	import openInTab from './lib/open-in-tab';
	import trimName from './lib/trim-name';

	interface IconInfo {
		size: number;
		url: string;
	}

	interface Props {
		id: string;
		name: string;
		shortName?: string;
		enabled: boolean;
		installType: string;
		homepageUrl?: string;
		updateUrl?: string;
		optionsUrl?: string;
		icons?: IconInfo[];
		showExtras: boolean;
		undoStack: UndoStack;
		isPinned?: boolean;
		oncontextmenu?: (event: MouseEvent) => void;
		onpin?: () => void;
	}

	let {
		id,
		name,
		shortName,
		enabled = $bindable(),
		installType,
		homepageUrl,
		updateUrl,
		optionsUrl,
		icons,
		showExtras = $bindable(),
		undoStack,
		isPinned = false,
		oncontextmenu,
		onpin,
	}: Props = $props();

	const getI18N = chrome.i18n.getMessage;
	const chromeWebStoreUrl = `https://chrome.google.com/webstore/detail/${id}`;
	const edgeWebStoreUrl = `https://microsoftedge.microsoft.com/addons/detail/${id}`;
	const url = generateHomeURL();
	// The browser will still fill the "short name" with "name" if missing
	const realName = trimName(shortName ?? name);

	function generateHomeURL(): string | undefined {
		if (installType !== 'normal') {
			return homepageUrl;
		}

		return updateUrl?.startsWith('https://edge.microsoft.com')
			? edgeWebStoreUrl
			: chromeWebStoreUrl;
	}

	function toggleExtension(event: MouseEvent) {
		// Check if Ctrl/Cmd is held down for pinning
		if (event.ctrlKey || event.metaKey) {
			onpin?.();
			return;
		}

		const wasEnabled = enabled;

		undoStack.do(toggle => {
			chrome.management.setEnabled(id, toggle !== wasEnabled);
		});
	}

	function onUninstallClick() {
		chrome.management.uninstall(id);
	}
</script>

<li
	class:disabled={!enabled}
	class:pinned={isPinned}
	class="ext type-{installType}"
>
	<button
		type="button"
		class="ext-name"
		onclick={toggleExtension}
		oncontextmenu={oncontextmenu}
	>
		<img alt="" src={pickBestIcon(icons, 16)} />{realName}
	</button>
	{#if optionsUrl && enabled}
		<a href={optionsUrl} title={getI18N('gotoOpt')} onclick={openInTab}>
			<img src="icons/options.svg" alt="" />
		</a>
	{/if}
	{#if showExtras}
		{#if url}
			<a href={url} title={getI18N('openUrl')} target="_blank" rel="noreferrer">
				<img src="icons/globe.svg" alt="" />
			</a>
		{/if}
		<a
			href="chrome://extensions/?id={id}"
			title={getI18N('manage')}
			onclick={openInTab}
		>
			<img src="icons/ellipsis.svg" alt="" />
		</a>
		<button
			type="button"
			title={getI18N('uninstall')}
			onclick={onUninstallClick}
		>
			<img src="icons/bin.svg" alt="" />
		</button>
	{/if}
</li>
