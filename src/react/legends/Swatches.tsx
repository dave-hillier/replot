import {pathRound as path} from "d3";
import React from "react";
import {inferFontVariant} from "../../axes.js";
import {inferTickFormat} from "../../marks/axis.js";
import {isNoneish, isScaleOptions, maybeColorChannel, maybeNumberChannel} from "../../options.js";
import {isOrdinalScale, isThresholdScale, normalizeScale} from "../../scales.js";
import {maybeClassName} from "../../style.js";
import type {LegendScales} from "../../legends.js";
import {legendStyleSheet, swatchesStyle} from "./legendStyles.js";

// Pure-JSX port of `src/legends/swatches.js`. Emits the same HTML+SVG tree the
// imperative renderer builds (a wrapping <div> with a <style> block, then a
// <span> or <div> per scale-domain entry containing an inline SVG swatch and a
// label). Used by the React `<Legend>` façade when the legend type is
// "swatches" (color/opacity ordinal/threshold) or whenever a symbol scale is
// provided.

interface SwatchesOptions {
  columns?: string | number;
  tickFormat?: any;
  fontVariant?: any;
  swatchSize?: number;
  swatchWidth?: number;
  swatchHeight?: number;
  marginLeft?: number;
  className?: string | null;
  style?: React.CSSProperties | string | null;
  width?: number;
  opacity?: number;
}

interface SymbolSwatchesOptions extends SwatchesOptions {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  r?: number;
}

interface ColorSwatchesProps extends SwatchesOptions {
  scale: any; // a normalized color/opacity scale descriptor
}

interface SymbolSwatchesProps extends SymbolSwatchesOptions {
  scale: any; // a normalized symbol scale descriptor
  resolve?: (key: string) => any; // resolves "color" channel to a color scale
}

// Top-level dispatcher: takes the same prop shape as the imperative `legend`
// API (a `LegendScales` bag), figures out which swatches variant applies, and
// returns the corresponding JSX. Returns `null` for anything other than a
// swatches-style legend (the caller should fall back to the ramp path).
export function Swatches(props: LegendScales): React.ReactElement | null {
  // Symbol scales are always rendered as swatches.
  if (isScaleOptions((props as any).symbol)) {
    const {symbol, color, fill, stroke, ...rest} = props as any;
    // Only default the stroke hint to the color scale when the fill is not
    // specified; a fill (e.g. "color") suppresses the stroke upstream.
    const computedStroke = stroke === undefined && fill === undefined && isScaleOptions(color) ? "color" : stroke;
    const hint = {fill, stroke: computedStroke};
    const scale = normalizeScale("symbol", symbol, hint);
    const resolve = (key: string) =>
      isScaleOptions((props as any)[key]) ? normalizeScale(key, (props as any)[key]) : null;
    return <SymbolSwatches scale={scale} fill={fill} stroke={computedStroke} resolve={resolve} {...rest} />;
  }

  // Color: swatches only for ordinal / explicit "swatches" legend.
  if (isScaleOptions((props as any).color)) {
    const {color, legend, ...rest} = props as any;
    const scale = normalizeScale("color", color);
    if (scale.domain === undefined) return null;
    const kind =
      legend === undefined || legend === true
        ? scale.type === "ordinal"
          ? "swatches"
          : "ramp"
        : `${legend}`.toLowerCase();
    if (kind !== "swatches") return null;
    return <ColorSwatches scale={scale} {...rest} />;
  }

  // Opacity: swatches for ordinal/threshold opacity scales.
  if (isScaleOptions((props as any).opacity)) {
    const {opacity, legend, color = "rgb(0,0,0)", ...rest} = props as any;
    const scale = normalizeScale("opacity", opacity);
    if (scale.type !== "ordinal" && scale.type !== "threshold") return null;
    const kind = legend === undefined || legend === true ? "swatches" : `${legend}`.toLowerCase();
    if (kind !== "swatches") return null;
    return <ColorSwatches scale={{...scale, color, key: "opacity"}} {...rest} />;
  }

  return null;
}

// Renders ordinal/threshold color (or color-ish opacity) swatches as inline
// <svg><rect/></svg> filled by scale.scale(d).
export function ColorSwatches({scale, opacity, ...options}: ColorSwatchesProps): React.ReactElement {
  if (!isOrdinalScale(scale) && !isThresholdScale(scale)) {
    throw new Error(`swatches legend requires ordinal or threshold color scale (not ${scale.type})`);
  }
  const isOpacity = scale.key === "opacity";
  const fill = isOpacity ? scale.color : (d: any) => scale.scale(d);
  const fillOpacity = isOpacity ? (d: any) => scale.scale(d) : maybeNumberChannel(opacity)[1];
  const renderSwatch = (d: any, w: number, h: number) => (
    <svg
      width={w}
      height={h}
      fill={typeof fill === "function" ? fill(d) : fill}
      fillOpacity={typeof fillOpacity === "function" ? fillOpacity(d) : fillOpacity}
    >
      <rect width="100%" height="100%" />
    </svg>
  );
  return <SwatchesContainer scale={scale} renderSwatch={renderSwatch} {...options} />;
}

// Renders symbol swatches as inline <svg><path/></svg>; resolves any
// channel-bound fill/stroke ("color") via the optional `resolve` callback.
export function SymbolSwatches({
  scale,
  fill = scale.hint?.fill !== undefined ? scale.hint.fill : "none",
  fillOpacity = 1,
  stroke = scale.hint?.stroke !== undefined ? scale.hint.stroke : isNoneish(fill) ? "currentColor" : "none",
  strokeOpacity = 1,
  strokeWidth = 1.5,
  r = 4.5,
  resolve,
  ...options
}: SymbolSwatchesProps): React.ReactElement {
  const [vf, cf] = maybeColorChannel(fill);
  const [vs, cs] = maybeColorChannel(stroke);
  const sf = vf == null ? null : maybeResolveScale(resolve, vf);
  const ss = vs == null ? null : maybeResolveScale(resolve, vs);
  const size = r * r * Math.PI;
  const fo = maybeNumberChannel(fillOpacity)[1];
  const so = maybeNumberChannel(strokeOpacity)[1];
  const sw = maybeNumberChannel(strokeWidth)[1];
  const renderSwatch = (d: any, w: number, h: number) => {
    const p = path();
    scale.scale(d).draw(p, size);
    return (
      <svg
        viewBox="-8 -8 16 16"
        width={w}
        height={h}
        fill={vf === "color" && sf ? sf.scale(d) : cf}
        fillOpacity={fo}
        stroke={vs === "color" && ss ? ss.scale(d) : cs}
        strokeOpacity={so}
        strokeWidth={sw}
      >
        <path d={p.toString()} />
      </svg>
    );
  };
  return <SwatchesContainer scale={scale} renderSwatch={renderSwatch} {...options} />;
}

function maybeResolveScale(resolve: ((key: string) => any) | undefined, key: string): any {
  if (!resolve) return null;
  if (key !== "color") return null;
  const s = resolve(key);
  if (!s) throw new Error(`scale not found: ${key}`);
  return s;
}

interface SwatchesContainerProps extends SwatchesOptions {
  scale: any;
  renderSwatch: (d: any, w: number, h: number) => React.ReactNode;
}

function SwatchesContainer({
  scale,
  renderSwatch,
  columns,
  tickFormat,
  fontVariant = inferFontVariant(scale),
  swatchSize = 15,
  swatchWidth = swatchSize,
  swatchHeight = swatchSize,
  marginLeft = 0,
  className,
  style,
  width
}: SwatchesContainerProps): React.ReactElement {
  const cls = maybeClassName(className ?? undefined);
  const tf = inferTickFormat(scale.scale, scale.domain, undefined, tickFormat, undefined);
  const layout = columns != null ? "columns" : "wrap";
  const containerStyle: React.CSSProperties = {
    ...(typeof style === "object" && style !== null ? style : null),
    ...(columns != null ? {columns: String(columns)} : null),
    ...(marginLeft ? {marginLeft: `${+marginLeft}px`} : null),
    ...(width !== undefined ? {width: `${+width}px`} : null),
    ...(fontVariant !== undefined && fontVariant !== "normal" ? {fontVariant: fontVariant as any} : null)
  };

  return (
    <div className={`${cls}-swatches ${cls}-swatches-${layout}`} style={containerStyle}>
      {legendStyleSheet(swatchesStyle(cls, layout))}
      {scale.domain.map((d: any, i: number) => {
        const label = tf.call(null, d, i);
        return columns != null ? (
          // d3's .text()/.attr("title") clear on a null value, so omit text/title.
          <div key={i} className={`${cls}-swatch`}>
            {renderSwatch(d, swatchWidth, swatchHeight)}
            <div className={`${cls}-swatch-label`} title={label != null ? `${label}` : undefined}>
              {label != null ? `${label}` : null}
            </div>
          </div>
        ) : (
          // Mirrors `createTextNode(tickFormat(...))`, which coerces null to "null".
          <span key={i} className={`${cls}-swatch`}>
            {renderSwatch(d, swatchWidth, swatchHeight)}
            {`${label}`}
          </span>
        );
      })}
    </div>
  );
}
