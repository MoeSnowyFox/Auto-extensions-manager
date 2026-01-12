/** Required for chrome:// links */
export default function openInTab(event: MouseEvent): void {
	const target = event.currentTarget as HTMLAnchorElement;
	chrome.tabs.create({ url: target.href });
	event.preventDefault();
}
