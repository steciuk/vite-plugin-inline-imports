# vite-plugin-inline-imports

Solution based on an awesome hacky way of busting vite's cache used in [vite-plugin-force-inline-module](https://github.com/soultice/vite-plugin-force-inline-module).

Created in order to:

- solve issues the original plugin had with building the project in 'watch' mode,
- allow for more control over the plugin's behavior.

**⚠️ Keep in mind that this plugin is still in early development and may not work as expected.**

## Usage

```
npm install --save-dev vite-plugin-inline-imports
```

```ts
import { inlineImports } from 'vite-plugin-inline-imports'

export default defineConfig{
  // ...
  plugins: [
    inlineImports({
      rules: [
        {
          for: [/regex matching importers/]
          inline: [/regex matching imports/]
          recursively: false // optional
        }
      ],
      inlineTag: '___!inline!___' // optional
    })
  // ...
  ],
  // ...
}
```

`rules` is an array of objects with the following properties:

- `for`: An array of regular expressions that match against the paths to files for which the rule should apply. Keep in mind that the first rule that matches will be used.
- `inline`: An array of regular expressions that are matched against the paths to files that should be inlined for the files specified in `for`.
- `recursively` (optional, default: `false`): A boolean that indicates whether to recursively inline imports in the inlined files. If `true` and some imports are inlined by plugin, all of their imports will be inlined too.

Let's say that you want to inline all imports from directory `consts` for all files in `entry` directory (but not subdirectories) and you want to inline all util functions (and modules imported by them) from `utils` directory only for `entry/entry1.ts`. You can do it like this:

```ts
import { inlineImports } from 'vite-plugin-inline-imports'

export default defineConfig{
  // ...
  plugins: [
    inlineImports({
      rules: [
        {
          for: [/entry\//]
          inline: [/consts\//]
        },
        {
          for: [/entry\/entry1\.ts$/]
          inline: [/utils\//],
          recursively: true
        }
      ]
    })
  // ...
  ],
  // ...
}
```

For more examples check out the [tests](./test/inlineImports.test.ts).

## Simple example

Let's say you have two project entry files `entry1.ts` and `entry2.ts` both importing a function from `shared.ts` file.

```ts
// entry1.ts, entry2.ts
import { sharedFunction } from './shared.ts';

sharedFunction();
```

```ts
// shared.ts
export function sharedFunction() {
	console.log('shared function');
}
```

Normally, vite would bundle `shared.ts` into a separate file and both entry files would import it from there. That would look like this:

```js
// entry1.js, entry2.js
import { sharedFunction } from './shared.js';

sharedFunction();
```

```js
// shared.js
function sharedFunction() {
	console.log('shared function');
}
export { sharedFunction };
```

With this plugin, you can inline `shared.ts` content into both entry files. That would look like this:

```js
// entry1.js, entry2.js
function sharedFunction() {
	console.log('shared function');
}
sharedFunction();
```

## TODO

- [ ] Change RegExp to glob patterns for `for` and `inline` properties.
- [ ] Test the plugin with other vite versions.
- [ ] Try to force vite not to duplicate code when inlining the same file both recursively and explicitly.
- [ ] Add more examples.
- [ ] Add waaaaay more tests:
  - [ ] Test the plugin with other vite plugins.
  - [ ] Test the plugin with more complex projects.
