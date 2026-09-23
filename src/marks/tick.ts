import {identity, number} from "../options.js";
import type {ChannelValueSpec} from "../channel.js";
import type {InsetOptions} from "../inset.js";
import type {Data, MarkOptions} from "../mark.js";
import {Mark} from "../mark.js";
import type {MarkerOptions} from "../marker.js";
import {markers} from "../marker.js";
import {offset} from "../style.js";
import {channelStyleProps, directStyleProps, indirectStyleProps, transformProp} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import {createElement as h, Fragment, type ReactNode} from "react";
import {markerToJSX} from "../react/Markers.js";

/** Options for the tickX mark. */
export interface TickXOptions extends MarkOptions, MarkerOptions, Omit<InsetOptions, "insetLeft" | "insetRight"> {
  /**
   * The required horizontal position of the tick; a channel typically bound to
   * the *x* scale.
   */
  x?: ChannelValueSpec;

  /**
   * The optional vertical position of the tick; an ordinal channel typically
   * bound to the *y* scale. If not specified, the tick spans the vertical
   * extent of the frame; otherwise the *y* scale must be a *band* scale.
   *
   * If *y* represents quantitative or temporal values, use a ruleX mark
   * instead.
   */
  y?: ChannelValueSpec;
}

/** Options for the tickY mark. */
export interface TickYOptions extends MarkOptions, MarkerOptions, Omit<InsetOptions, "insetTop" | "insetBottom"> {
  /**
   * The required vertical position of the tick; a channel typically bound to
   * the *y* scale.
   */
  y?: ChannelValueSpec;

  /**
   * The optional horizontal position of the tick; an ordinal channel typically
   * bound to the *x* scale. If not specified, the tick spans the horizontal
   * extent of the frame; otherwise the *x* scale must be a *band* scale.
   *
   * If *x* represents quantitative or temporal values, use a ruleY mark
   * instead.
   */
  x?: ChannelValueSpec;
}

const defaults = {
  ariaLabel: "tick",
  fill: null,
  stroke: "currentColor"
};

class AbstractTick extends Mark {
  constructor(data: any, channels: any, options: any) {
    super(data, channels, options, defaults);
    markers(this, options);
  }
  renderJSX(this: any, index: any, scales: any, channels: any, dimensions: any, context: any): ReactNode {
    // A mark whose data is null has no index; render nothing rather than crash.
    if (index == null) index = [];
    const {stroke: S} = channels;
    const indirect = indirectStyleProps(this);
    const transform = (this as any)._transformProp(scales);
    const direct = directStyleProps(this);
    const x1Of = this._x1(scales, channels, dimensions);
    const x2Of = this._x2(scales, channels, dimensions);
    const y1Of = this._y1(scales, channels, dimensions);
    const y2Of = this._y2(scales, channels, dimensions);
    const x1Fn = typeof x1Of === "function" ? x1Of : () => x1Of;
    const x2Fn = typeof x2Of === "function" ? x2Of : () => x2Of;
    const y1Fn = typeof y1Of === "function" ? y1Of : () => y1Of;
    const y2Fn = typeof y2Of === "function" ? y2Of : () => y2Of;
    // Every line names the same marker and color, so one def serves them all;
    // the second reference to a def finds it here rather than asking for a
    // duplicate. custom markers get the render context so they can build their
    // element in the plot's document.
    const markerDefs = new Map<string, ReactNode>();
    const markerAttrsFor = (color: any) => {
      const out: Record<string, string> = {};
      for (const [opt, attr] of [
        [this.markerStart, "markerStart"],
        [this.markerMid, "markerMid"],
        [this.markerEnd, "markerEnd"]
      ] as const) {
        if (!opt) continue;
        const m = markerToJSX(opt, color, context);
        if (!m) continue;
        if (!markerDefs.has(m.id)) markerDefs.set(m.id, m.defJSX);
        out[attr] = m.urlRef;
      }
      return out;
    };
    const lines = (index as number[]).map((i, k) => {
      const channel = channelStyleProps(i, channels);
      const titled = withTitleChild(this, channels, i, null);
      const color = S ? S[i] : this.stroke;
      const markerAttrs = markerAttrsFor(color);
      const lineEl = h(
        "line",
        {key: k, ...direct, ...channel, ...markerAttrs, x1: x1Fn(i), x2: x2Fn(i), y1: y1Fn(i), y2: y2Fn(i)},
        titled
      );
      return withHrefWrap(channels, this.target, i, lineEl);
    });
    const defs =
      markerDefs.size > 0
        ? h(
            "defs",
            {key: "__defs"},
            ...Array.from(markerDefs.entries()).map(([id, def]) => h(Fragment, {key: id}, def))
          )
        : null;
    return h("g", {...indirect, ...transform}, defs, ...lines);
  }
}

export class TickX extends AbstractTick {
  insetTop: number;
  insetBottom: number;
  constructor(data: any, options: any = {}) {
    const {x, y, inset = 0, insetTop = inset, insetBottom = inset} = options;
    super(
      data,
      {
        x: {value: x, scale: "x"},
        y: {value: y, scale: "y", type: "band", optional: true}
      },
      options
    );
    this.insetTop = number(insetTop);
    this.insetBottom = number(insetBottom);
  }
  _transformProp({x}: any) {
    return transformProp(this as any, {x}, offset, 0);
  }
  _x1(scales: any, {x: X}: any) {
    return (i: any) => X[i];
  }
  _x2(scales: any, {x: X}: any) {
    return (i: any) => X[i];
  }
  _y1({y}: any, {y: Y}: any, {marginTop}: any) {
    const {insetTop} = this;
    return Y && y ? (i: any) => Y[i] + insetTop : marginTop + insetTop;
  }
  _y2({y}: any, {y: Y}: any, {height, marginBottom}: any) {
    const {insetBottom} = this;
    return Y && y ? (i: any) => Y[i] + y.bandwidth() - insetBottom : height - marginBottom - insetBottom;
  }
}

export class TickY extends AbstractTick {
  insetRight: number;
  insetLeft: number;
  constructor(data: any, options: any = {}) {
    const {x, y, inset = 0, insetRight = inset, insetLeft = inset} = options;
    super(
      data,
      {
        y: {value: y, scale: "y"},
        x: {value: x, scale: "x", type: "band", optional: true}
      },
      options
    );
    this.insetRight = number(insetRight);
    this.insetLeft = number(insetLeft);
  }
  _transformProp({y}: any) {
    return transformProp(this as any, {y}, 0, offset);
  }
  _x1({x}: any, {x: X}: any, {marginLeft}: any) {
    const {insetLeft} = this;
    return X && x ? (i: any) => X[i] + insetLeft : marginLeft + insetLeft;
  }
  _x2({x}: any, {x: X}: any, {width, marginRight}: any) {
    const {insetRight} = this;
    return X && x ? (i: any) => X[i] + x.bandwidth() - insetRight : width - marginRight - insetRight;
  }
  _y1(scales: any, {y: Y}: any) {
    return (i: any) => Y[i];
  }
  _y2(scales: any, {y: Y}: any) {
    return (i: any) => Y[i];
  }
}

/**
 * Returns a new horizontally-positioned tickX mark (a vertical line, |) for the
 * given *data* and *options*. The **x** channel specifies the tick’s horizontal
 * position and defaults to identity, assuming that *data* = [*x₀*, *x₁*, *x₂*,
 * …]; the optional **y** ordinal channel specifies its vertical position. For
 * example, for a horizontal barcode plot of penguins’ weights:
 *
 * ```js
 * Plot.tickX(penguins, {x: "body_mass_g", y: "sex", stroke: "species"})
 * ```
 *
 * If *y* represents quantitative or temporal values, use a ruleX mark instead.
 */
export function tickX(data?: Data, options: TickXOptions = {}): TickX {
  const {x = identity, ...rest} = options as any;
  return new TickX(data, {...rest, x});
}

/**
 * Returns a new vertically-positioned tickY mark (a horizontal line, —) for the
 * given *data* and *options*. The **y** channel specifies the vertical position
 * of the tick and defaults to identity, assuming that *data* = [*y₀*, *y₁*,
 * *y₂*, …]; the optional **x** ordinal channel specifies its horizontal
 * position. For example, for a vertical barcode plot of penguins’ weights:
 *
 * ```js
 * Plot.tickY(penguins, {y: "body_mass_g", x: "sex", stroke: "species"})
 * ```
 *
 * If *x* represents quantitative or temporal values, use a ruleY mark instead.
 */
export function tickY(data?: Data, options: TickYOptions = {}): TickY {
  const {y = identity, ...rest} = options as any;
  return new TickY(data, {...rest, y});
}
