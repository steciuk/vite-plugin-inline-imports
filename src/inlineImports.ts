import { PluginOption } from 'vite';

/**
 * This function returns a Vite plugin that inlines imports based on the provided rules.
 *
 * @param rules An array of objects that define the rules for inlining imports. Each object has the following fields:
 * - `for`: An array of regular expressions that match against the paths to files for which the rule should apply.
 * - `inline`: An array of regular expressions that are matched against the paths to files that should be inlined for the files specified in `for`.
 * - `recursively` (optional, default: `false`): A boolean that indicates whether to recursively inline imports in the inlined files. If some imports are inlined by plugin, all of their imports will be inlined too.
 * @param inlineTag (optional, default: `___!inline!___`) A string that is used to identify inlined imports. Make sure that it doesn't conflict with any directory or file names.
 * @returns A Vite plugin object.
 */
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

// TODO: change RegExp to glob patterns
export type InlineImportsRule = {
	for: RegExp[];
	inline: RegExp[];
	recursively?: boolean;
};

function randomVarName(): string {
	return `var${Math.random().toString().slice(2)}`;
}

function shouldBeInlined(
	rules: InlineImportsRule[],
	resolvedId: string,
	importer: string,
	inlineRoot: string
): boolean {
	const rulesForInlineRoot = rules.filter((rule) => rule.for.some((pattern) => pattern.test(inlineRoot)));
	if (rulesForInlineRoot.some((rule) => rule.recursively)) return true;

	const matchingRules = rules.filter((rule) => rule.for.some((pattern) => pattern.test(importer)));
	if (matchingRules.length === 0) return false;

	return matchingRules.some((rule) => rule.inline.some((pattern) => pattern.test(resolvedId)));
}
