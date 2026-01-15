import {mount} from 'svelte';
import ProfilesApp from './profiles-app.svelte';

const app = mount(ProfilesApp, {
	target: document.getElementById('app')!,
});

export default app;
