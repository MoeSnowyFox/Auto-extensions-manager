import type {ToggleFunction} from './types';
import {isHoldingModifier} from './cmd-key';

export default class UndoStack {
	private _undoStack: [ToggleFunction, ToggleFunction | undefined][] = [];
	private _redoStack: [ToggleFunction, ToggleFunction | undefined][] = [];

	constructor(element?: Window | HTMLElement) {
		element?.addEventListener(
			'keydown',
			this.#keyboardEventListener as EventListener,
		);
	}

	#keyboardEventListener = (event: KeyboardEvent): void => {
		if (event.code === 'KeyZ' && isHoldingModifier(event)) {
			if (event.shiftKey) {
				this.redo();
			} else {
				this.undo();
			}

			// Without this, it will also undo the filter input field.
			// That's never useful, so it's best to never allow nor exclude it.
			event.preventDefault();
		}
	};

	private runSafely(fn: ToggleFunction, toggle: boolean): void {
		try {
			const result = fn(toggle);
			if (result && typeof (result as Promise<void>).catch === 'function') {
				(result as Promise<void>).catch(() => {
					// Swallow: failures here are expected for non-modifiable extensions.
				});
			}
		} catch {
			// Swallow
		}
	}

	undo(): void {
		const functions = this._undoStack.pop();
		if (functions) {
			console.log('UndoStack: undo');
			const [toggleFunction, undoFunction] = functions;
			this.runSafely(undoFunction || toggleFunction, false);
			this._redoStack.push(functions);
		} else {
			console.warn('UndoStack: nothing to undo');
		}
	}

	redo(): void {
		const functions = this._redoStack.pop();
		if (functions) {
			console.log('UndoStack: redo');
			const [doFunction] = functions;
			this.runSafely(doFunction, true);
			this._undoStack.push(functions);
		} else {
			console.warn('UndoStack: nothing to redo');
		}
	}

	do(doFunction: ToggleFunction, undoFunction?: ToggleFunction): void {
		console.log('UndoStack: pushed');
		if (typeof doFunction !== 'function') {
			throw new TypeError('you must pass at least one function');
		}

		if (undoFunction && typeof undoFunction !== 'function') {
			throw new Error('undoFn must be a function or undefined');
		}

		this._redoStack.length = 0;
		this._undoStack.push([doFunction, undoFunction]);
		this.runSafely(doFunction, true);
	}

	clear(): void {
		this._undoStack.length = 0;
		this._redoStack.length = 0;
	}
}
