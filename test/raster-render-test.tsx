// @ts-nocheck — JSDOM tests; the imperative plot() entry returns a DOM node.
//
// #164: the raster mark must parse colours through a canvas in the mark's
// colorSpace and cache the result, rather than re-parsing each pixel with
// d3-color (which ignores colorSpace and disagrees with the canvas on
// fractional alpha), and must spell the image-rendering attribute the way
// React expects.
import assert from "assert";
import {createCanvas, loadImage} from "canvas";
import jsdomit from "./jsdom.js";
import * as Plot from "../src/index.ts";

// The 1×1 canvas a colour converter reads is not exposed by any snapshot, so
// these tests observe the canvas API itself: the counts and arguments the mark
// passes to getContext and getImageData are the port's contract with upstream
// (which parses colours exactly this way).
function spyOnCanvas() {
  const proto = document.createElement("canvas").constructor.prototype;
  const realGetContext = proto.getContext;
  const calls = {contexts: [], imageReads: 0};
  proto.getContext = function (type, attrs) {
    calls.contexts.push(attrs ?? null);
    const context = realGetContext.call(this, type, attrs);
    if (!context) return context;
    return new Proxy(context, {
      // Native 2D methods and accessors reject a Proxy for `this`, so hand
      // everything back bound to the real context.
      set(target, prop, value) {
        return Reflect.set(target, prop, value, target);
      },
      get(target, prop) {
        const value = Reflect.get(target, prop, target);
        if (typeof value !== "function") return value;
        return (...args) => {
          if (prop === "getImageData") ++calls.imageReads;
          return value.apply(target, args);
        };
      }
    });
  };
  return {
    calls,
    restore() {
      proto.getContext = realGetContext;
    }
  };
}

// Decodes the PNG the mark embedded in its <image>, so that a test can assert
// on the pixels the mark produced rather than on its internals.
async function pixelsOf(svg) {
  const image = svg.querySelector("image");
  assert.ok(image, "expected an <image>");
  const href = image.getAttribute("xlink:href") ?? image.getAttribute("href");
  const png = await loadImage(Buffer.from(href.slice(href.indexOf(",") + 1), "base64"));
  const canvas = createCanvas(png.width, png.height);
  const context = canvas.getContext("2d");
  context.drawImage(png, 0, 0);
  return context.getImageData(0, 0, png.width, png.height);
}

describe("raster colorSpace", () => {
  it("defaults to srgb", () => {
    assert.strictEqual(Plot.raster(null, {width: 2, height: 2}).colorSpace, "srgb");
  });

  it("lowercases the given colorSpace", () => {
    assert.strictEqual(Plot.raster(null, {width: 2, height: 2, colorSpace: "Display-P3"}).colorSpace, "display-p3");
  });

  jsdomit("asks every canvas it creates for the mark's colorSpace", () => {
    const spy = spyOnCanvas();
    try {
      Plot.plot({marks: [Plot.raster([1, 2], {width: 2, height: 1, colorSpace: "display-p3"})]});
    } finally {
      spy.restore();
    }
    // One canvas parses colours (1×1) and one draws the image; both must be
    // created in the wide-gamut space for the values to survive.
    assert.strictEqual(spy.calls.contexts.length, 2, "expected a converter canvas and a render canvas");
    for (const attrs of spy.calls.contexts) assert.strictEqual(attrs?.colorSpace, "display-p3");
  });
});

describe("raster color conversion", () => {
  jsdomit("parses each distinct colour once, not once per pixel", () => {
    const spy = spyOnCanvas();
    try {
      // Four pixels, two distinct fills: the colour parser should see the two
      // fills plus the mark's baseline colour, and not the other two pixels.
      Plot.plot({
        marks: [Plot.raster([1, 2, 3, 4], {width: 4, height: 1, fill: (x) => (x < 3 ? "red" : "blue")})]
      });
    } finally {
      spy.restore();
    }
    assert.strictEqual(spy.calls.imageReads, 3, "expected one canvas read per distinct colour");
  });

  jsdomit("caches the colour converter on the mark across renders", () => {
    const mark = Plot.raster([1, 2], {width: 2, height: 1, fill: () => "red"});
    Plot.plot({marks: [mark]});
    const converter = mark.colorConverter;
    assert.strictEqual(typeof converter, "function", "expected a colour converter cached on the mark");
    assert.strictEqual(converter("red"), converter("red"), "expected a colour to be parsed once");
    assert.notStrictEqual(converter("red"), converter("blue"), "expected a parse per distinct colour");
    const spy = spyOnCanvas();
    try {
      Plot.plot({marks: [mark]});
    } finally {
      spy.restore();
    }
    assert.strictEqual(mark.colorConverter, converter, "expected the second render to reuse the converter");
    assert.strictEqual(spy.calls.imageReads, 0, "expected the second render to parse nothing");
  });

  jsdomit("renders the colour the canvas parsed", async () => {
    const svg = Plot.plot({marks: [Plot.raster([1, 2], {width: 2, height: 1, fill: () => "rgb(200, 100, 50)"})]});
    const {data} = await pixelsOf(svg);
    assert.deepStrictEqual(Array.from(data.slice(0, 4)), [200, 100, 50, 255]);
    assert.deepStrictEqual(Array.from(data.slice(4, 8)), [200, 100, 50, 255]);
  });

  jsdomit("renders a null fill as fully transparent black", async () => {
    // Upstream's converter returns an all-zero sentinel for a null colour, so
    // the pixel must not inherit the previous pixel's colour.
    const svg = Plot.plot({marks: [Plot.raster([1, 2], {width: 2, height: 1, fill: (x) => (x > 1 ? null : "red")})]});
    const {data} = await pixelsOf(svg);
    assert.deepStrictEqual(Array.from(data.slice(0, 4)), [255, 0, 0, 255]);
    assert.deepStrictEqual(Array.from(data.slice(4, 8)), [0, 0, 0, 0]);
  });

  jsdomit("quantises a colour's own alpha the way the canvas does", async () => {
    // The canvas rounds 0.5 alpha down to 127, where multiplying by 255 in JS
    // gives 128; the pixel matches upstream only if the canvas did the parsing.
    const svg = Plot.plot({marks: [Plot.raster([1], {width: 1, height: 1, fill: () => "rgba(0, 0, 0, 0.5)"})]});
    const {data} = await pixelsOf(svg);
    assert.strictEqual(data[3], 127);
  });

  jsdomit("composes the colour's own alpha with fillOpacity", async () => {
    const svg = Plot.plot({
      marks: [Plot.raster([1], {width: 1, height: 1, fill: () => "rgba(0, 0, 0, 0.5)", fillOpacity: 0.5})]
    });
    const {data} = await pixelsOf(svg);
    assert.strictEqual(data[3], 64, `expected 127 × 0.5 = 63.5 to round to 64, got ${data[3]}`);
  });
});

describe("raster imageRendering", () => {
  jsdomit("sets the image-rendering attribute without warning", () => {
    const errors = [];
    const realError = console.error;
    console.error = (...args) => errors.push(args.join(" "));
    let svg;
    try {
      svg = Plot.plot({marks: [Plot.raster([1, 2], {width: 2, height: 1, imageRendering: "pixelated"})]});
    } finally {
      console.error = realError;
    }
    assert.deepStrictEqual(errors, [], "expected no React invalid-property warning");
    assert.strictEqual(svg.querySelector("image").getAttribute("image-rendering"), "pixelated");
  });

  jsdomit("omits image-rendering when it is the default", () => {
    // impliedString drops a value equal to the default, so the attribute is
    // emitted only when it differs from *auto* (as upstream's applyAttr does).
    for (const options of [{}, {imageRendering: "auto"}]) {
      const svg = Plot.plot({marks: [Plot.raster([1, 2], {width: 2, height: 1, ...options})]});
      assert.strictEqual(svg.querySelector("image").getAttribute("image-rendering"), null);
    }
  });
});
