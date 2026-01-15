import {mount} from 'svelte';
import App from './app.svelte';
import fitWindow from './lib/fit-window';
import preventMultipleWindows from './lib/single-window';

mount(App, {
	target: document.body,
});

const autoFit = new URLSearchParams(location.search).has('auto-fit');
if (autoFit) {
	fitWindow();
}

preventMultipleWindows();
