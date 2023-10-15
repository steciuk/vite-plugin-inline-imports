import path from 'path';
import { inlineImports } from 'src/inlineImports';
import { build } from 'vite';
import { test } from 'vitest';

test(
	'inlineImports',
	async () => {
		const bundle = await build({
			plugins: [inlineImports({ rules: [] })],
			build: {
				outDir: path.resolve(__dirname, './multiEntry/dist'),
				rollupOptions: {
					input: {
						entry1: path.resolve(__dirname, './multiEntry/entry1.ts'),
						entry2: path.resolve(__dirname, './multiEntry/entry2.ts'),
					},
				},
			},
		});

		console.log('bundle!!!!');
		console.log(bundle);

		// expect(bundle).not.toContain('___!inline!___');
	},
	{ timeout: 100000 }
);
