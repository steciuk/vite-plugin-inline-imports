import path from 'path';
import { inlineImports } from 'src/inlineImports';
import { build, mergeConfig } from 'vite';
import { expect, test } from 'vitest';

const commonConfig = {
	configFile: false,
	logLevel: 'silent',
	build: {
		minify: false,
		// outDir: path.resolve(__dirname, './dist'),
		outDir: undefined,
		rollupOptions: {
			input: {
				entry1: path.resolve(__dirname, './multiEntry/entry1.ts'),
				entry2: path.resolve(__dirname, './multiEntry/entry2.ts'),
				entry3: path.resolve(__dirname, './multiEntry/entry3.ts'),
			},
			output: {
				entryFileNames: '[name].js',
				chunkFileNames: '[name].js',
				assetFileNames: '[name].js',
				minifyInternalExports: false,
			},
		},
	},
};

test("Inlining imports with empty rules doesn't interfere with normal chunkification", async () => {
	const bundle = await build(
		mergeConfig(commonConfig, {
			plugins: [
				inlineImports({
					rules: [
						{
							for: [],
							inline: [],
						},
					],
				}),
			],
		})
	);

	const output = (bundle as any).output;
	expect(output.length).toBe(3 + 1);
	const generatedFiles = output.map((file: any) => file.fileName);
	expect(generatedFiles).toContain('entry1.js');
	expect(generatedFiles).toContain('entry2.js');
	expect(generatedFiles).toContain('entry3.js');
	expect(generatedFiles).toContain('shared.js');
});

test("Inlining import for one entry doesn't change chunkification for the rest", async () => {
	const bundle = await build(
		mergeConfig(commonConfig, {
			plugins: [
				inlineImports({
					rules: [
						{
							for: [/multiEntry\/entry1.ts/],
							inline: [/multiEntry\/shared2.ts/, /multiEntry\/shared.ts/],
						},
					],
				}),
			],
		})
	);

	const output = (bundle as any).output;
	expect(output.length).toBe(3 + 2);

	const entry1Code = output.find((file: any) => file.fileName === 'entry1.js').code;
	expect(entry1Code).not.toContain('from "./shared.js"');

	const generatedFiles = output.map((file: any) => file.fileName);
	expect(generatedFiles).toContain('entry1.js');
	expect(generatedFiles).toContain('entry2.js');
	expect(generatedFiles).toContain('entry3.js');
	expect(generatedFiles).toContain('shared.js');
	expect(generatedFiles).toContain('shared2.js');
});

test('Inlining parent with recursive flag inlines all its children', async () => {
	const bundle = await build(
		mergeConfig(commonConfig, {
			plugins: [
				inlineImports({
					rules: [
						{
							for: [/multiEntry\/entry1.ts/],
							inline: [/multiEntry\/shared.ts/],
							recursively: true,
						},
					],
				}),
			],
		})
	);

	const output = (bundle as any).output;
	expect(output.length).toBe(3 + 2);

	const entry1Code = output.find((file: any) => file.fileName === 'entry1.js').code;
	expect(entry1Code).not.toContain(`function shared2() {
    console.log("shared2");
  }
  function shared() {
    console.log("shared");
    shared2();
  }`);

	const generatedFiles = output.map((file: any) => file.fileName);
	expect(generatedFiles).toContain('entry1.js');
	expect(generatedFiles).toContain('entry2.js');
	expect(generatedFiles).toContain('entry3.js');
	expect(generatedFiles).toContain('shared.js');
	expect(generatedFiles).toContain('shared2.js');
});

test('If any of the rules dictates that the file should be inlined, it is inlined', async () => {
	const bundle = await build(
		mergeConfig(commonConfig, {
			plugins: [
				inlineImports({
					rules: [
						{
							for: [/multiEntry\/entry1.ts/],
							inline: [],
						},
						{
							for: [/multiEntry\/entry1.ts/],
							inline: [/multiEntry\/shared.ts/, /multiEntry\/shared2.ts/],
							recursively: true,
						},
					],
				}),
			],
		})
	);

	const output = (bundle as any).output;
	const entry1Code = output.find((file: any) => file.fileName === 'entry1.js').code;
	expect(entry1Code).not.toContain('import');
});
