import {Children, cloneElement, createElement as h, isValidElement, type ReactElement, type ReactNode} from "react";
import type {ChannelValue, ChannelValueSpec} from "../channel.js";
import {indirectStyleProps, directStyleProps, transformProp, groupChannelStyleProps} from "../react/styles.js";
import {withHrefWrap, withTitleChild} from "../react/styles-jsx.js";
import type {CurveOptions} from "../curve.js";
import type {CompoundMark, Data, MarkOptions} from "../mark.js";
import {marks} from "../mark.js";
import {withTip} from "../mark.js";
import {identity, indexOf} from "../options.js";
// @ts-expect-error - internal helpers not in .d.ts
import {isNoneish, labelof, maybeColorChannel, maybeValue, valueof} from "../options.js";
import {inferScaleOrder} from "../scales.js";
import {area} from "./area.js";
import {line} from "./line.js";

/** Options for the difference mark. */
export interface DifferenceOptions extends MarkOptions, CurveOptions {
  /**
   * The comparison horizontal position channel, typically bound to the *x*
   * scale; if not specified, **x** is used. For differenceX, defaults to zero
   * if only one *x* and *y* channel is specified.
   */
  x1?: ChannelValueSpec;

  /**
   * The primary horizontal position channel, typically bound to the *x* scale;
   * if not specified, **x1** is used.
   */
  x2?: ChannelValueSpec;

  /** The horizontal position channel, typically bound to the *x* scale. */
  x?: ChannelValueSpec;

  /**
   * The comparison vertical position channel, typically bound to the *y* scale;
   * if not specified, **y** is used. For differenceY, defaults to zero if only
   * one *x* and *y* channel is specified.
   */
  y1?: ChannelValueSpec;

  /**
   * The primary vertical position channel, typically bound to the *y* scale;
   * if not specified, **y1** is used.
   */
  y2?: ChannelValueSpec;

  /** The vertical position channel, typically bound to the *y* scale. */
  y?: ChannelValueSpec;

  /**
   * The fill color when the primary value is greater than the secondary value;
   * defaults to green.
   */
  positiveFill?: ChannelValueSpec;

  /**
   * The fill color when the primary value is less than the secondary value;
   * defaults to blue.
   */
  negativeFill?: ChannelValueSpec;

  /** The fill opacity; defaults to 1. */
  fillOpacity?: number;

  /**
   * The fill opacity when the primary value is greater than the secondary
   * value; defaults to **fillOpacity**.
   */
  positiveFillOpacity?: number;

  /**
   * The fill opacity when the primary value is less than the secondary value;
   * defaults to **fillOpacity**.
   */
  negativeFillOpacity?: number;

  /**
   * An optional ordinal channel for grouping data into series to be drawn as
   * separate areas; defaults to **stroke**, if a channel.
   */
  z?: ChannelValue;
}

/**
 * Returns a new horizontal difference mark for the given the specified *data*
 * and *options*, as in a time-series chart where time goes down↓ (or up↑).
 *
 * The mark is a composite of a positive area, negative area, and line. The
 * positive area extends from the left of the frame to the line, and is clipped
 * by the area extending from the comparison to the right of the frame. The
 * negative area conversely extends from the right of the frame to the line, and
 * is clipped by the area extending from the comparison to the left of the
 * frame.
 */
export function differenceX(data?: Data, options?: DifferenceOptions): CompoundMark {
  return differenceK("x", data, options);
}

/**
 * Returns a new vertical difference mark for the given the specified *data* and
 * *options*, as in a time-series chart where time goes right→ (or ←left).
 *
 * The mark is a composite of a positive area, negative area, and line. The
 * positive area extends from the bottom of the frame to the line, and is
 * clipped by the area extending from the comparison to the top of the frame.
 * The negative area conversely extends from the top of the frame to the line,
 * and is clipped by the area extending from the comparison to the bottom of the
 * frame.
 */
export function differenceY(data?: Data, options?: DifferenceOptions): CompoundMark {
  return differenceK("y", data, options);
}

function differenceK(
  k: "x" | "y",
  data: Data | undefined,
  {
    x1,
    x2,
    y1,
    y2,
    x = x1 === undefined && x2 === undefined ? (k === "y" ? indexOf : identity) : undefined,
    y = y1 === undefined && y2 === undefined ? (k === "x" ? indexOf : identity) : undefined,
    fill, // ignored
    positiveFill = "#3ca951",
    negativeFill = "#4269d0",
    fillOpacity = 1,
    positiveFillOpacity = fillOpacity,
    negativeFillOpacity = fillOpacity,
    stroke,
    strokeOpacity,
    z = maybeColorChannel(stroke)[0],
    clip, // optional additional clip for area
    tip,
    render, // composed onto the two areas only, as upstream does
    ...options
  }: any = {}
): CompoundMark {
  [x1, x2] = memoTuple(x, x1, x2);
  [y1, y2] = memoTuple(y, y1, y2);
  if (x1 === x2 && y1 === y2) {
    if (k === "y") y1 = memo(0);
    else x1 = memo(0);
  }
  ({tip} = withTip({tip}, k === "y" ? "x" : "y"));
  const shared = {x1, x2, y1, y2, z, clip, ...options};
  return marks(
    !isNoneish(positiveFill)
      ? clippedArea(
          data,
          {...shared, fill: positiveFill, fillOpacity: positiveFillOpacity},
          clipDifferenceJSX(k, true),
          "positive difference",
          render
        )
      : null,
    !isNoneish(negativeFill)
      ? clippedArea(
          data,
          {...shared, fill: negativeFill, fillOpacity: negativeFillOpacity},
          clipDifferenceJSX(k, false),
          "negative difference",
          render
        )
      : null,
    line(data, {
      x: x2,
      y: y2,
      z,
      stroke,
      strokeOpacity,
      tip,
      clip: true,
      ...options
    })
  );
}

// One of the two clipped areas. A user *render* transform is composed outside
// the clip, as upstream's composeRender(render, clipDifference(k, …))
// (difference.js:38,60) does: the transform receives the clipped area as its
// `next`, and whatever it returns is rendered in its place. The line is not
// given the transform at all, which is why differenceK destructures it.
function clippedArea(data: Data | undefined, options: any, clipJSX: any, ariaLabel: string, render: any): any {
  const areaMark = Object.assign(area(data, {...options, renderJSX: clipJSX}), {ariaLabel});
  if (render == null) return areaMark;
  // The clip renderJSX is an own property of the area, and an own renderJSX
  // tells the JSX paths that the mark renders itself, so the imperative bridge
  // would be skipped (see hasRenderTransform). Inheriting the finished mark
  // instead — renderJSX then resolves through the prototype — keeps the clip
  // and still brings the own `render` into the JSX path. `this` stays the area,
  // so the transform sees the mark's styles and aria-label, as upstream's
  // composeRender (which preserves `this`) does.
  const mark = Object.create(areaMark);
  mark.render = render;
  return mark;
}

function memoTuple(x: any, x1: any, x2: any) {
  if (x1 === undefined && x2 === undefined) {
    // {x} → [x, x]
    x1 = x2 = memo(x);
  } else if (x1 === undefined) {
    // {x2} → [x2, x2]
    // {x, x2} → [x, x2]
    x2 = memo(x2);
    x1 = x === undefined ? x2 : memo(x);
  } else if (x2 === undefined) {
    // {x1} → [x1, x1]
    // {x, x1} → [x1, x]
    x1 = memo(x1);
    x2 = x === undefined ? x1 : memo(x);
  } else {
    // {x1, x2} → [x1, x2]
    x1 = memo(x1);
    x2 = memo(x2);
  }
  return [x1, x2];
}

function memo(v: any) {
  let V: any;
  const {value, label = labelof(value)} = maybeValue(v);
  return {transform: (data: any) => V || (V = valueof(data, value)), label};
}

// JSX parallel to clipDifference: invokes `next` (the underlying area's
// renderJSX) twice with channel overrides, then pairs up the resulting <path>
// children — wrapping one set in <clipPath> defs and applying clip-path refs
// to the matching paths in the other. Touch the JSX style helpers so that the
// import surface matches sibling ported marks.
void indirectStyleProps;
void directStyleProps;
void transformProp;
void groupChannelStyleProps;
void withHrefWrap;
void withTitleChild;

function clipDifferenceJSX(k: "x" | "y", positive: boolean) {
  const f = k === "x" ? "y" : "x";
  const f1 = `${f}1`;
  const f2 = `${f}2`;
  const k1 = `${k}1`;
  const k2 = `${k}2`;
  return (index: any, scales: any, channels: any, dimensions: any, context: any, next: any): ReactNode => {
    const {[f1]: F1, [f2]: F2} = channels;
    const K1 = new Float32Array(F1.length);
    const K2 = new Float32Array(F2.length);
    const m = dimensions[k === "y" ? "height" : "width"];
    (positive === inferScaleOrder(scales[k]) < 0 ? K1 : K2).fill(m);
    const clipNode = next(index, scales, {...channels, [f2]: F1, [k2]: K2}, dimensions, context) as ReactElement;
    const gNode = next(index, scales, {...channels, [f1]: F2, [k1]: K1}, dimensions, context) as ReactElement;
    const clipChildren = Children.toArray((clipNode as any)?.props?.children).filter(isValidElement);
    const gChildren = Children.toArray((gNode as any)?.props?.children).filter(isValidElement);
    const out: ReactNode[] = [];
    const n = Math.min(clipChildren.length, gChildren.length);
    for (let i = 0; i < n; i++) {
      const id = clipIdOf(context);
      const clipChild = clipChildren[i] as ReactElement;
      const gChild = gChildren[i] as ReactElement;
      out.push(h("clipPath", {key: `cp-${i}`, id}, clipChild));
      out.push(cloneElement(gChild, {key: `g-${i}`, clipPath: `url(#${id})`} as any));
    }
    return cloneElement(gNode, gNode.props as any, ...out);
  };
}

// The id for one of this mark's own <clipPath> defs, taken from the clip
// registry of the render that is building the <svg>. Each facet and each of
// the two areas takes its own id, in render order, which is deterministic for
// a given computed plot — so the ids neither collide with the frame clip's (a
// difference plot always has one: the differenced line is clip: true) nor
// change when React re-renders the marks without recomputing them. Both render
// paths create the registry before rendering any mark and expose it on the
// plot's context, which is what a renderJSX is given; assert rather than fall
// back to style.js's module-global counter, which is the collision this
// replaced.
function clipIdOf(context: any): string {
  const registry = context?.clipRegistry;
  if (registry == null) throw new Error("difference: no clip registry on the plot context");
  return registry.clipId();
}
