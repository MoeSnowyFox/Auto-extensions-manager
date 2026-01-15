import process from 'node:process';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import {copy} from '@web/rollup-plugin-copy';
import cleanup from 'rollup-plugin-cleanup';
import del from 'rollup-plugin-delete';
import livereload from 'rollup-plugin-livereload';
import svelte from 'rollup-plugin-svelte';

const production = !process.env.ROLLUP_WATCH;

const config = {
	input: {
		main: 'source/main.ts',
		'options/options': 'source/options/options.ts',
		'profiles/profiles': 'source/profiles/profiles.ts',
		background: 'source/background.ts',
	},
	output: {
		sourcemap: !production,
		format: 'es',
		dir: 'distribution',
	},
	plugins: [
		del({
			targets: ['distribution'],
			runOnce: true,
		}),
		svelte({
			compilerOptions: {
				dev: !production,
			},
		}),
		typescript({
			sourceMap: !production,
			inlineSources: !production,
			include: ['source/**/*.ts'],
			exclude: ['**/*.test.ts'],
		}),
		resolve({
			browser: true,
			dedupe: ['svelte'],
			extensions: ['.ts', '.js', '.svelte'],
		}),
		commonjs(),
		copy({
			rootDir: './source',
			patterns: '**/*',
			exclude: ['**/*.ts', '**/*.svelte'],
		}),
		cleanup(),
		!production && livereload('distribution'),
	],
};

export default config;
