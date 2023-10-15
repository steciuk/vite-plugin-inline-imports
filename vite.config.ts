/// <reference types="vitest" />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
	resolve: {
		alias: {
			src: './src',
		},
	},
	build: {
		lib: {
			entry: './src/index.ts',
			name: 'vite-plugin-inline-imports',
			fileName: 'vite-plugin-inline-imports',
		},
		minify: false,
	},
	plugins: [
		dts({
			rollupTypes: true,
		}),
	],
	test: {
		include: ['./test/**/*.test.ts'],
	},
});
