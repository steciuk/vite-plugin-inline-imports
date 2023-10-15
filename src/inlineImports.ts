import { PluginOption } from 'vite';

export function inlineImports({
	rules = [],
	inlineTag = '___!inline!___',
}: {
	rules: {
		for: RegExp[];
		inline: RegExp[];
	}[];
	inlineTag?: string;
}): PluginOption {
	// ---------------
	const modulesToInline = ['asdsf'];
	console.log(rules);
	// ---------------

	const codeMap = new Map<string, string>();

	return {
		name: 'vite-plugin-inline-imports',
		enforce: 'pre',
		async resolveId(source, importer, options) {
			if (!modulesToInline.some((module) => source.includes(module))) return;

			const resolution = await this.resolve(source, importer, {
				skipSelf: true,
				...options,
			});
			if (!resolution) return;

			const code = await this.load({ id: resolution.id });
			if (!code.code) return;
			codeMap.set(resolution.id, code.code);

			return { id: `${randomVarName()}${inlineTag}${resolution.id}` };
		},
		load(id) {
			if (id.includes(inlineTag)) {
				const realId = id.split(inlineTag)[1];
				const code = codeMap.get(realId);
				if (!code) return;

				return code;
			}
		},
	};
}

export type InlineImportsOptions = Parameters<typeof inlineImports>[0];

function randomVarName(): string {
	return `var${Math.random().toString().slice(2)}`;
}
