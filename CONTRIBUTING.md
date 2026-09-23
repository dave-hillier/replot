# Replot - Contributing

Replot is open source and released under the [ISC license](./LICENSE). You are welcome to [send us pull requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests) to contribute bug fixes or new features. We also invite you to participate in [issues](https://github.com/dave-hillier/replot/issues) and [discussions](https://github.com/dave-hillier/replot/discussions). We use issues to track and diagnose bugs, as well as to debate and design enhancements to Replot. Discussions are intended for you to ask for help using Replot, or to share something cool you’ve built with it. For questions about the underlying grammar shared with [Observable Plot](https://observablehq.com/plot/), the [Observable Forum](https://talk.observablehq.com) is also a good resource.

We request that you abide by our [code of conduct](https://observablehq.com/@observablehq/code-of-conduct) when contributing and participating in discussions.

## Development

To contribute to Replot, you’ll need a local development environment to make and test changes to Replot’s source code. To get started, follow GitHub’s tutorial on [forking (and cloning) a repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo). Once you’ve cloned your fork of the Replot repository, open a terminal and `cd` in your forked repository. Then run Yarn to install dependencies:

```bash
yarn
```

You may encounter an error installing [node-canvas](https://github.com/Automattic/node-canvas), such as:

```
node-pre-gyp ERR! install response status 404 Not Found on https://github.com/Automattic/node-canvas/releases/download/v2.9.1/canvas-v2.9.1-node-v93-darwin-unknown-arm64.tar.gz
node-pre-gyp WARN Pre-built binaries not installable for canvas@2.9.1 and node@16.15.0 (node-v93 ABI, unknown) (falling back to source compile with node-gyp)
node-pre-gyp WARN Hit error response status 404 Not Found on https://github.com/Automattic/node-canvas/releases/download/v2.9.1/canvas-v2.9.1-node-v93-darwin-unknown-arm64.tar.gz
```

If this happens, you will need to [compile node-canvas from source](https://github.com/Automattic/node-canvas/blob/master/Readme.md#compiling). On macOS you can use Homebrew to install the needed dependencies:

```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

## Testing

After making changes to Replot’s source code, run the test suite to verify that your code is doing what you expect and that you haven’t introduced any other unexpected changes in behavior. Replot has two types of tests: **unit tests** and **snapshot tests**. Tests are run automatically on pull requests (via GitHub Actions), but you’ll want to run them locally to verify your changes before opening a pull request. To run the tests, use Yarn:

```bash
yarn test
```

This will also run ESLint on Replot’s source to help catch simple mistakes, such as unused imports.

Please run Prettier before submitting any pull request. Check “format on save” in your code editor, or run:

```bash
yarn prettier --write .
```

A test coverage report can be generated with [c8](https://github.com/bcoe/c8), in text and lcov formats, to help you identify which lines of code are not (yet!) covered by tests. Just run:

```bash
yarn test:coverage
```

### Unit tests

Unit tests live in `test` and have the `-test.js` file extension; see [`test/marks/area-test.js`](./test/marks/area-test.js) for example. Generally speaking, unit tests make specific, low-level assertions about the behavior of Replot’s API, including internals and helper methods. If you add a new feature, or change the behavior of an existing feature, please update the unit tests so that we can more easily maintain your contribution into the future. For example, here’s a unit test that tests how Replot formats months:

```js
it("formatMonth(locale, format) does the right thing", () => {
  assert.strictEqual(Plot.formatMonth("en", "long")(0), "January");
  assert.strictEqual(Plot.formatMonth("en", "short")(0), "Jan");
  assert.strictEqual(Plot.formatMonth("en", "narrow")(0), "J");
});
```

Replot’s unit tests are written with [Mocha](https://mochajs.org).

If you like, you can also run Mocha in watch mode for a specific file, so that unit tests re-run automatically when you make changes. For example:

```bash
TZ=America/Los_Angeles yarn tsx node_modules/.bin/mocha --watch test/marks/bar-test.js
```

The tests import `replot`, which package.json maps to `src/index.js`, a file that exists only as the TypeScript source `src/index.ts`; tsx resolves that, which is why Mocha has to run through it here, as it does in `yarn test:mocha`.

### Snapshot tests

Snapshot tests live in `test/plots` and are registered in [`test/plots/index.ts`](./test/plots/index.ts); see [`test/plots/aapl-bollinger.ts`](./test/plots/aapl-bollinger.ts) for example. Unlike unit tests which only test individual methods, snapshot tests actually visualize data—they’re more representative of how we expect people will use Replot. Snapshot tests can also serve as examples of how to use the Replot API, though note that some of the examples intentionally test edge case of the API and may not embody best practices. Each snapshot test defines a plot by exporting a default async function. For example, here’s a line chart using BLS unemployment data:

```ts
import * as Plot from "replot";
import * as d3 from "d3";

export async function lineUnemployment() {
  const bls = await d3.csv<any>("data/bls-metro-unemployment.csv", d3.autoType);
  return Plot.plot({
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(bls, {x: "date", y: "unemployment", z: "division"})
    ]
  });
}
```

When a snapshot test is run, its output is compared against the SVG or HTML snapshot saved in the `test/output` folder. This makes it easier to review the effect of code changes and to catch unintended changes. Snapshot tests must have deterministic, reproducible behavior; they should not depend on live data, external servers, the current time, the weather, etc. To use randomness in a test, use a seeded random number generator such as [d3.randomLcg](https://d3js.org/d3-random#randomLcg).

To add a new snapshot test, create a new JavaScript file in the `test/plots` folder using the pattern shown above. Then export your snapshot test function from [`test/plots/index.ts`](./test/plots/index.ts). For example:

```js
export * from "./moby-dick.ts";
```

The best thing about snapshot tests is that you can see the live result in your browser as you make changes to Replot’s source code! This lets you immediately assess visually what Replot is doing. To preview snapshot tests during development, Replot uses [Vite](https://vitejs.dev). To start Vite:

```bash
yarn dev
```

This will open http://localhost:8008/ in your browser where you can choose a snapshot test. As you edit the source, the current test will update live in your browser as you save changes. You can change the selected test from the drop-down menu. When the drop-down menu is focused, the left and right arrow keys cycle between tests.

![Replot’s snapshot test live preview](img/localhost.png)

When previewing snapshot tests, consider using your browser’s debugger or element inspector to assist development.

Running Replot’s snapshot tests will automatically generate any missing snapshots in `test/output`. You should `git add` these before committing your changes. (If you forget, your PR will fail in CI, and you’ll get a reminder.) Changed snapshots are saved alongside the originals with a `-changed` suffix for visual inspection. If your code intentionally changes some of the existing snapshots, simply blow away the existing snapshots and run the tests again. You can then review what’s changed using `git diff`.

```
rm -rf test/output
yarn test
```

### Parity with Observable Plot

The snapshots in `test/output` are Replot’s own, so a green run shows that Replot’s output has not changed, not that it matches Observable Plot. To check that, compare the snapshots against the ones committed in an Observable Plot checkout (expected as a sibling directory, `../observablehq-plot`, or pass `--upstream`):

```bash
yarn parity                       # every plot, summarised by cause
yarn parity --filter tip          # plots whose name contains "tip"
yarn parity --show tipDotFacets   # unified diff of one plot
```

The comparison canonicalises both sides (attribute order, generated ids and class names, numeric precision, whitespace), so what remains is a real structural or attribute difference. The per-plot line names what differs, for example `g +74` for extra wrapper groups or `image[href] −1, image[xlink:href] +1` for a renamed attribute. With `--allow <file> --fail` it exits non-zero when any plot not listed in the JSON array in that file differs, which lets CI hold the line on known divergences.

### The parity allow list

`parity-allow.json` is a JSON array naming every plot that currently differs from upstream. It is a ratchet, not a target: it records the parity debt as it stands today so that any *new* divergence is caught immediately.

```bash
yarn parity --allow parity-allow.json --fail
```

That is the command CI runs. It exits non-zero as soon as a plot that is not named in the file differs, so a change that breaks parity on a previously-identical plot fails the build.

Entries should only ever be **removed**, as a change brings a plot back into line with upstream; remove them in the same commit that fixes the plot. Do not add an entry to make a build green — a new differing plot is a regression to fix, not debt to record. Note the one blind spot: a plot already on the list stays green even if its diff grows, so read the per-plot `+`/`−` counts in `yarn parity` output when working on a listed plot.

Run `yarn test:mocha` before `yarn parity`, so the comparison sees the snapshots the current tree actually produces (adopt any `*-changed` files first).

## Documentation

When submitting a pull request, please remember to update Replot’s documentation to reflect changes to the public API. You are also welcome to edit Replot’s [CHANGELOG.md](./CHANGELOG.md) to assist with writing future release notes. In addition, please reference any related [issues](https://github.com/dave-hillier/replot/issues) (or discussions) in your pull request description.

If you’d like to share a live demonstration or motivating example of your change to Replot, you can regenerate the release bundle using Yarn:

```bash
yarn prepublishOnly
```

The generated bundle `dist/replot.umd.js` can then be loaded like so:

```html
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="replot.umd.js"></script>
```

Alternatively, you can attach the `dist/replot.umd.js` file to an [Observable notebook](https://observablehq.com), and then load it like so:

```js
Replot = require(await FileAttachment("replot.umd.js").url())
```
