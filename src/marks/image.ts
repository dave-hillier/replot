import {createElement as h, type ReactNode} from "react";
import type {ChannelValue, ChannelValueSpec} from "../channel.js";
import type {Data, FrameAnchor, MarkOptions} from "../mark.js";
import {positive} from "../defined.js";
import {Mark} from "../mark.js";
import {maybeFrameAnchor, maybeNumberChannel, maybeTuple, string} from "../options.js";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import {applyFrameAnchor, impliedString} from "../style.js";
import {withDefaultSort} from "./dot.js";

/** Options for the image mark. */
export interface ImageOptions extends MarkOptions {
  /**
   * The horizontal position channel specifying the image’s center; typically
   * bound to the *x* scale.
   */
  x?: ChannelValueSpec;

  /**
   * The vertical position channel specifying the image’s center; typically
   * bound to the *y* scale.
   */
  y?: ChannelValueSpec;

  /**
   * The image width in pixels. When a number, it is interpreted as a constant
   * radius in pixels; otherwise it is interpreted as a channel. Also sets the
   * default **height**; if neither are set, defaults to 16. Images with a
   * nonpositive width are not drawn.
   */
  width?: ChannelValue;

  /**
   * The image height in pixels. When a number, it is interpreted as a constant
   * radius in pixels; otherwise it is interpreted as a channel. Also sets the
   * default **height**; if neither are set, defaults to 16. Images with a
   * nonpositive height are not drawn.
   */
  height?: ChannelValue;

  /**
   * The image clip radius, for circular images. If null (default), images are
   * not clipped; when a number, it is interpreted as a constant in pixels;
   * otherwise it is interpreted as a channel, typically bound to the *r* scale.
   * Also defaults **height** and **width** to twice its value.
   */
  r?: ChannelValue;

  /**
   * The rotation angle, in degrees clockwise. When a number, it is interpreted
   * as a constant; otherwise it is interpreted as a channel.
   */
  rotate?: ChannelValue;

  /**
   * The required image URL (or relative path). If a string that starts with a
   * dot, slash, or URL protocol (*e.g.*, “https:”) it is assumed to be a
   * constant; otherwise it is interpreted as a channel.
   */
  src?: ChannelValue;

  /**
   * The image [aspect ratio][1]; defaults to *xMidYMid meet*. To crop the image
   * instead of scaling it to fit, use *xMidYMid slice*.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio
   */
  preserveAspectRatio?: string;

  /**
   * The [cross-origin][1] behavior. See the [Plot.image notebook][2] for details.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/crossorigin
   * [2]: https://observablehq.com/@observablehq/plot-image
   */
  crossOrigin?: string;

  /**
   * The frame anchor specifies defaults for **x** and **y** based on the plot’s
   * frame; it may be one of the four sides (*top*, *right*, *bottom*, *left*),
   * one of the four corners (*top-left*, *top-right*, *bottom-right*,
   * *bottom-left*), or the *middle* of the frame.
   */
  frameAnchor?: FrameAnchor;

  /**
   * The [image-rendering attribute][1]; defaults to *auto* (bilinear). The
   * option may be set to *pixelated* to disable bilinear interpolation for a
   * sharper image; however, note that this is not supported in WebKit.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/image-rendering
   */
  imageRendering?: string;
}

const defaults = {
  ariaLabel: "image",
  fill: null,
  stroke: null
};

// Tests if the given string is a path: does it start with a dot-slash
// (./foo.png), dot-dot-slash (../foo.png), or slash (/foo.png)?
function isPath(string: string) {
  return /^\.*\//.test(string);
}

// Tests if the given string is a URL (e.g., https://placekitten.com/200/300).
// The allowed protocols is overly restrictive, but we don’t want to allow any
// scheme here because it would increase the likelihood of a false positive with
// a field name that happens to contain a colon.
function isUrl(string: string) {
  return /^(blob|data|file|http|https):/i.test(string);
}

// Disambiguates a constant src definition from a channel. A path or URL string
// is assumed to be a constant; any other string is assumed to be a field name.
function maybePathChannel(value: any) {
  return typeof value === "string" && (isPath(value) || isUrl(value)) ? [undefined, value] : [value, undefined];
}

/** The image mark. */
export class Image extends Mark {
  src: any;
  width: any;
  rotate: any;
  height: any;
  r: any;
  preserveAspectRatio: any;
  crossOrigin: any;
  frameAnchor: any;
  imageRendering: any;
  constructor(data?: Data, options: ImageOptions = {}) {
    let {r, width, height} = options as any;
    const {x, y, rotate, src, preserveAspectRatio, crossOrigin, frameAnchor, imageRendering} = options as any;
    if (r == null) r = undefined;
    if (r === undefined && width === undefined && height === undefined) width = height = 16;
    else if (width === undefined && height !== undefined) width = height;
    else if (height === undefined && width !== undefined) height = width;
    const [vs, cs] = maybePathChannel(src);
    const [vr, cr] = maybeNumberChannel(r);
    const [vw, cw] = maybeNumberChannel(width, cr !== undefined ? cr * 2 : undefined);
    const [vh, ch] = maybeNumberChannel(height, cr !== undefined ? cr * 2 : undefined);
    const [va, ca] = maybeNumberChannel(rotate, 0);
    super(
      data,
      {
        x: {value: x, scale: "x", optional: true},
        y: {value: y, scale: "y", optional: true},
        r: {value: vr, scale: "r", filter: positive, optional: true},
        width: {value: vw, filter: positive, optional: true},
        height: {value: vh, filter: positive, optional: true},
        rotate: {value: va, optional: true},
        src: {value: vs, optional: true}
      },
      withDefaultSort(options),
      defaults
    );
    this.src = cs;
    this.width = cw;
    this.rotate = ca;
    this.height = ch;
    this.r = cr;
    this.preserveAspectRatio = impliedString(preserveAspectRatio, "xMidYMid");
    this.crossOrigin = string(crossOrigin);
    this.frameAnchor = maybeFrameAnchor(frameAnchor);
    this.imageRendering = impliedString(imageRendering, "auto");
  }
  renderJSX(this: any, index: any, scales: any, channels: any, dimensions: any, _context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {x, y} = scales;
    const {x: X, y: Y, width: W, height: H, r: R, rotate: A, src: S} = channels;
    const {r, width, height, rotate} = this;
    const [cx, cy] = applyFrameAnchor(this, dimensions);
    const indirect = indirectStyleProps(this);
    const direct = directStyleProps(this);
    const transform = transformProp(this, {x: X && x, y: Y && y});
    const xOf = position(X, W, R, cx, width, r);
    const yOf = position(Y, H, R, cy, height, r);
    const wOf = W ? (i: number) => W[i] : width !== undefined ? width : R ? (i: number) => R[i] * 2 : r * 2;
    const hOf = H ? (i: number) => H[i] : height !== undefined ? height : R ? (i: number) => R[i] * 2 : r * 2;
    const xCenter = X ? (i: number) => X[i] : cx;
    const yCenter = Y ? (i: number) => Y[i] : cy;
    const images = (index as number[]).map((i, k) => {
      const channel = channelStyleProps(i, channels);
      const props: Record<string, any> = {
        key: k,
        ...direct,
        ...channel,
        x: typeof xOf === "function" ? xOf(i) : xOf,
        y: typeof yOf === "function" ? yOf(i) : yOf,
        width: typeof wOf === "function" ? wOf(i) : wOf,
        height: typeof hOf === "function" ? hOf(i) : hOf,
        href: S ? S[i] : this.src,
        preserveAspectRatio: this.preserveAspectRatio,
        crossOrigin: this.crossOrigin,
        imageRendering: this.imageRendering
      };
      const rotation = A ? A[i] : rotate;
      if (rotation) {
        const ox = typeof xCenter === "function" ? xCenter(i) : xCenter;
        const oy = typeof yCenter === "function" ? yCenter(i) : yCenter;
        props.transform = `rotate(${rotation})`;
        props.transformOrigin = `${ox}px ${oy}px`;
      }
      const clip = R ? `circle(${R[i]}px)` : r !== undefined ? `circle(${r}px)` : null;
      if (clip != null) props.clipPath = clip;
      const titled = withTitleChild(this, channels, i, null);
      const imgEl = h("image", props, titled);
      return withHrefWrap(channels, this.target, i, imgEl);
    });
    return h("g", {...indirect, ...transform}, images);
  }
}

function position(X: any, W: any, R: any, x: number, w: any, r: any) {
  return W && X
    ? (i: number) => X[i] - W[i] / 2
    : W
    ? (i: number) => x - W[i] / 2
    : X && w !== undefined
    ? (i: number) => X[i] - w / 2
    : w !== undefined
    ? x - w / 2
    : R && X
    ? (i: number) => X[i] - R[i]
    : R
    ? (i: number) => x - R[i]
    : X
    ? (i: number) => X[i] - r
    : x - r;
}

/**
 * Returns a new image mark for the given *data* and *options* that draws images
 * as in a scatterplot. For example, portraits of U.S. presidents by date of
 * inauguration and favorability:
 *
 * ```js
 * Plot.image(presidents, {x: "inauguration", y: "favorability", src: "portrait"})
 * ```
 *
 * If either **x** or **y** is not specified, the default is determined by the
 * **frameAnchor** option. If none of **x**, **y**, and **frameAnchor** are
 * specified, *data* is assumed to be an array of pairs [[*x₀*, *y₀*], [*x₁*,
 * *y₁*], [*x₂*, *y₂*], …] such that **x** = [*x₀*, *x₁*, *x₂*, …] and **y** =
 * [*y₀*, *y₁*, *y₂*, …].
 */
export function image(data?: Data, {x, y, ...options}: ImageOptions = {}): Image {
  if ((options as any).frameAnchor === undefined) [x, y] = maybeTuple(x, y);
  return new Image(data, {...options, x, y});
}
