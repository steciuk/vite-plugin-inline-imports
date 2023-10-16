import { PluginOption } from 'vite';

export function inlineImports({
	rules = [],
	inlineTag = '___!inline!___',
}: {
	rules: InlineImportsRule[];
	inlineTag?: string;
}): PluginOption {
	const codeMap = new Map<string, string>();

	return {
		name: 'vite-plugin-inline-imports',
		enforce: 'pre',
		async resolveId(source, importer, options) {
			// Entry file, no need to inline
			if (!importer || options.isEntry) return;

			let inlineRoot = '';
			let realImporter = importer;
			if (importer.includes(inlineTag)) {
				realImporter = importer.split(inlineTag)[2];
				inlineRoot = importer.split(inlineTag)[1];
			}

			const resolution = await this.resolve(source, realImporter, {
				skipSelf: true,
				...options,
			});
			// Failed to resolve or external module
			if (!resolution || resolution.external) return;

			if (shouldBeInlined(rules, resolution.id, realImporter, inlineRoot)) {
				const code = await this.load({ id: resolution.id });
				inlineRoot = inlineRoot ? inlineRoot : realImporter;
				// Failed to load file contents
				if (!code.code) return;
				const fakeId = `${randomVarName()}${inlineTag}${inlineRoot}${inlineTag}${resolution.id}`;
				codeMap.set(fakeId, code.code);

				return { id: fakeId };
			}

			// If importer is inlined, it means we provided fake id for it
			// and vite won't resolve any of its imports, so we have to
			// return the real id of all it's children if they aren't inlined
			if (inlineRoot !== '') {
				return { id: resolution.id };
			}
		},
		load(id) {
			return codeMap.get(id);
		},
	};
}

export type InlineImportsOptions = Parameters<typeof inlineImports>[0];

function randomVarName(): string {
	return `var${Math.random().toString().slice(2)}`;
}

function shouldBeInlined(
	rules: InlineImportsRule[],
	resolvedId: string,
	importer: string,
	inlineRoot: string
): boolean {
	const ruleForInlineRoot = rules.find((rule) => rule.for.some((pattern) => pattern.test(inlineRoot)));
	if (ruleForInlineRoot?.recursively) {
		return true;
	}

	const rule = rules.find((rule) => rule.for.some((pattern) => pattern.test(importer)));
	if (!rule) return false;

	return rule.inline.some((pattern) => pattern.test(resolvedId));
}

// TODO: change RegExp to glob patterns
type InlineImportsRule = {
	for: RegExp[];
	inline: RegExp[];
	recursively?: boolean;
};
