// React JSX port of `legendRamp` from src/legends/ramp.js. Renders a ramp
// legend (continuous color, threshold, or ordinal) directly as an <svg> tree
// without any d3-selection / DOM-mutation. Pure helpers (interpolators, color
// stops, tick formatting) come from d3 and the existing JS implementation.

import React, {Fragment, useId} from "react";
import {format, interpolateNumber, piecewise, quantize, scaleBand, scaleLinear} from "d3";
import {inferFontVariant} from "../../axes.js";
// These helpers exist in the JS sources but aren't in the corresponding .d.ts
// shims, so we reach into them via untyped imports.
import {createContext} from "../../context.js";
import {map, maybeNumberChannel} from "../../options.js";
import {interpolatePiecewise} from "../../scales/quantitative.js";
import {impliedString, maybeClassName} from "../../style.js";
import {legendStyleSheet, rampStyle} from "./legendStyles.js";

// Mirrors the option bag accepted by the imperative `legendRamp(color, options)`.
// The first positional argument (`color`) is exposed here as the `scale` prop;
// all other knobs match the imperative names.
export interface RampProps {
  scale: any;
  label?: string;
  tickSize?: number;
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  style?: React.CSSProperties | string;
  ticks?: number | any[];
  tickFormat?: ((d: any, i?: number) => any) | string | null;
  fontVariant?: string;
  round?: boolean;
  opacity?: any;
  className?: string;
  // When set, paints the ramp under an SVG <filter> that floods with this
  // color and composites it through the ramp body — mirrors the imperative
  // rampWithFilter() used for ordinal/threshold opacity ramps.
  filterColor?: string;
}

export function Ramp(props: RampProps) {
  const color = props.scale;
  const {
    label = color.label,
    tickSize = 6,
    width = 240,
    height = 44 + tickSize,
    marginTop = 18,
    marginRight = 0,
    marginBottom = 16 + tickSize,
    marginLeft = 0,
    style,
    fontVariant = inferFontVariant(color),
    round = true
  } = props;

  let {ticks = (width - marginLeft - marginRight) / 64, tickFormat} = props;
  const className = maybeClassName(props.className);
  const opacity = maybeNumberChannel(props.opacity)[1];
  if (tickFormat === null) tickFormat = () => null as any;

  // Stable id used when wrapping the body under an SVG color-flood filter
  // (mirrors imperative rampWithFilter for ordinal/threshold opacity ramps).
  const reactId = useId();
  const filterColor = props.filterColor;
  const filterId = filterColor ? `plot-filter-${reactId.replace(/[^A-Za-z0-9_-]/g, "")}` : null;
  const rampId = `plot-ramp-${reactId.replace(/[^A-Za-z0-9_-]/g, "")}`;

  const context = createContext(props as any);
  const applyRange = round
    ? (s: any, range: number[]) => s.rangeRound(range)
    : (s: any, range: number[]) => s.range(range);

  const {type, domain, range, interpolate, scale, pivot} = color;

  let x: any;
  let body: React.ReactNode = null;
  // The ramp's paint server, when it needs one: a document-less render paints
  // the interpolate branch with a gradient instead of a canvas data URL, and
  // the gradient's definition is rendered next to the filter's, outside the
  // body it fills.
  let gradient: React.ReactNode = null;

  if (interpolate) {
    const interpolator =
      range === undefined
        ? interpolate
        : piecewise(interpolate.length === 1 ? interpolatePiecewise(interpolate) : interpolate, range);
    x = applyRange(
      scale.copy(),
      quantize(
        interpolateNumber(marginLeft, width - marginRight),
        Math.min(domain.length + (pivot !== undefined ? 1 : 0), range === undefined ? Infinity : range.length)
      )
    );
    // The ramp body is a 256x1 canvas interpolated into a data URL, which is
    // what the imperative legend produces and needs a document to build. A
    // server render has none, so it paints the same interpolator as an SVG
    // gradient instead: the legend is still complete and correct-looking in the
    // markup, and the browser path is untouched (whether the two agree is
    // rampGradient's subject). The two bodies are equivalent, not identical — a
    // client render of a server-rendered ramp legend replaces the gradient with
    // the image, which is the same hydration re-render every other part of a
    // server-rendered plot takes.
    const rampWidth = width - marginLeft - marginRight;
    const rampHeight = height - marginTop - marginBottom;
    gradient = context.document == null ? rampGradient(interpolator, rampId) : null;
    body = gradient ? (
      <rect
        opacity={opacity ?? undefined}
        x={marginLeft}
        y={marginTop}
        width={rampWidth}
        height={rampHeight}
        fill={`url(#${rampId})`}
      />
    ) : (
      <image
        opacity={opacity ?? undefined}
        x={marginLeft}
        y={marginTop}
        width={rampWidth}
        height={rampHeight}
        preserveAspectRatio="none"
        href={canvasDataURL(interpolator, context)}
      />
    );
  } else if (type === "threshold") {
    const thresholds = domain;
    const thresholdFormat =
      tickFormat === undefined
        ? (d: any) => d
        : typeof tickFormat === "string"
        ? format(tickFormat)
        : (tickFormat as any);
    x = applyRange(scaleLinear().domain([-1, range.length - 1]), [marginLeft, width - marginRight]);
    body = (
      <g fillOpacity={opacity ?? undefined}>
        {(range as any[]).map((d, i) => (
          <rect
            key={i}
            x={x(i - 1)}
            y={marginTop}
            width={x(i) - x(i - 1)}
            height={height - marginTop - marginBottom}
            fill={filterColor != null ? filterColor : d}
            fillOpacity={filterColor != null ? d : undefined}
          />
        ))}
      </g>
    );
    ticks = map(thresholds, ((_: any, i: number) => i) as any);
    tickFormat = (i: any) => thresholdFormat(thresholds[i], i);
  } else {
    // Ordinal
    x = applyRange(scaleBand().domain(domain as any), [marginLeft, width - marginRight]);
    body = (
      <g fillOpacity={opacity ?? undefined}>
        {(domain as any[]).map((d, i) => (
          <rect
            key={i}
            x={x(d)}
            y={marginTop}
            width={Math.max(0, x.bandwidth() - 1)}
            height={height - marginTop - marginBottom}
            fill={filterColor != null ? filterColor : scale(d)}
            fillOpacity={filterColor != null ? scale(d) : undefined}
          />
        ))}
      </g>
    );
  }

  // Bottom axis (replicates d3-axis output for the parts the imperative
  // legend keeps: ticks only — the .domain path is removed). For ordinal
  // band scales we don't shift the tick line up to span the ramp.
  const isBand = !interpolate && type !== "threshold";
  const tickAxisY = height - marginBottom;
  const tickLineY1 = isBand ? undefined : marginTop + marginBottom - height;
  const tickElements = renderTicks(x, ticks, tickFormat, tickSize, tickLineY1);

  // The imperative API accepts either a CSSStyleDeclaration-like object (which
  // it Object.assigns onto svg.style) or a raw style string (set as a property).
  // React only takes a CSSProperties object, so a string style is punted.
  const styleAttr = typeof style === "object" && style !== null ? (style as React.CSSProperties) : undefined;

  return (
    <svg
      className={`${className}-ramp`}
      fontFamily="system-ui, sans-serif"
      fontSize={10}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={styleAttr}
    >
      {legendStyleSheet(rampStyle(className))}
      {gradient}
      {filterId ? (
        <filter id={filterId}>
          <feFlood floodColor={filterColor} />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      ) : null}
      {filterId ? <g filter={`url(#${filterId})`}>{body}</g> : body}
      <g
        transform={`translate(0,${tickAxisY})`}
        fill="none"
        textAnchor="middle"
        fontVariant={impliedString(fontVariant, "normal") as any}
      >
        {tickElements}
      </g>
      {label != null ? (
        <text x={marginLeft} y={marginTop - 6} fill="currentColor" fontWeight="bold">
          {`${label}`}
        </text>
      ) : null}
    </svg>
  );
}

// Constructs the data URL for a 256x1 canvas filled by `interpolator(t)`.
function canvasDataURL(interpolator: (t: number) => string, context: any): string {
  const n = 256;
  const canvas = context.document.createElement("canvas");
  canvas.width = n;
  canvas.height = 1;
  const c2d = canvas.getContext("2d");
  for (let i = 0, j = n - 1; i < n; ++i) {
    c2d.fillStyle = interpolator(i / j);
    c2d.fillRect(i, 0, 1, 1);
  }
  return canvas.toDataURL();
}

// The ramp body without a DOM: the same interpolator sampled into a horizontal
// <linearGradient>, which a server render can emit as markup. 256 stops would
// be the canvas's own resolution and a needlessly large legend, so the ramp is
// sampled at 64 — the interpolators the legends use are piecewise-linear
// between a handful of stops, so sampling at 64 is within one and a half
// parts of 255 in any channel of what the canvas would paint (measured over
// sequential rgb, basis and turbo interpolators). The gradient is in
// objectBoundingBox units, so it stretches to whatever rect references it,
// exactly as preserveAspectRatio="none" stretches the image.
function rampGradient(interpolator: (t: number) => string, id: string): React.ReactNode {
  const n = 64;
  const offset = (i: number): string => `${+((100 * i) / (n - 1)).toFixed(4)}%`;
  return (
    <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
      {Array.from({length: n}, (_, i) => (
        <stop key={i} offset={offset(i)} stopColor={interpolator(i / (n - 1))} />
      ))}
    </linearGradient>
  );
}

// Replicates the tick markup that d3-axis (axisBottom) emits, minus the
// .domain path (which the imperative ramp removes). Each tick is a
// <g class="tick" transform="translate(x,0)"> with a <line> and <text>.
// Band scales are centered like d3-axis's center(): the tick sits in the
// middle of the band, rounded when the scale rounds its range.
function renderTicks(
  x: any,
  ticks: any,
  tickFormat: any,
  tickSize: number,
  tickLineY1: number | undefined
): React.ReactNode {
  const values: any[] = Array.isArray(ticks) ? ticks : typeof x.ticks === "function" ? x.ticks(ticks) : x.domain();
  const fmt: (d: any, i: number) => any =
    typeof tickFormat === "function"
      ? tickFormat
      : typeof tickFormat === "string" && typeof x.tickFormat === "function"
      ? x.tickFormat(ticks, tickFormat)
      : typeof x.tickFormat === "function"
      ? x.tickFormat(Array.isArray(ticks) ? null : ticks)
      : (d: any) => `${d}`;
  let bandOffset = 0;
  if (typeof x.bandwidth === "function") {
    bandOffset = Math.max(0, x.bandwidth() - 1) / 2;
    if (x.round()) bandOffset = Math.round(bandOffset);
  }
  return (
    <Fragment>
      {values.map((d, i) => {
        const tx = (x(d) ?? 0) + bandOffset;
        const text = fmt(d, i);
        return (
          <g key={i} className="tick" opacity={1} transform={`translate(${tx + 0.5},0)`}>
            <line stroke="currentColor" y2={tickSize} y1={tickLineY1} />
            <text fill="currentColor" y={tickSize + 3} dy="0.71em">
              {text == null ? "" : `${text}`}
            </text>
          </g>
        );
      })}
    </Fragment>
  );
}
