function focus(selector: string, next: boolean): void {
	const {activeElement} = document;
	if (!activeElement) {
		return;
	}

	const items = [...document.querySelectorAll<HTMLElement>(selector)];
	if (!next) {
		items.reverse();
	}

	for (const item of items) {
		const position = activeElement.compareDocumentPosition(item);
		if (
			position &
			(next
				? Node.DOCUMENT_POSITION_FOLLOWING
				: Node.DOCUMENT_POSITION_PRECEDING)
		) {
			item.focus();
			return;
		}
	}

	items.at(0)?.focus();
}

export function focusNext(selector: string): void {
	focus(selector, true);
}

export function focusPrevious(selector: string): void {
	focus(selector, false);
}
