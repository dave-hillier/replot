// replot/react — React component API for Replot
//
// This module is the package's "./react" entry point (see the `exports` map in
// package.json, the "replot/react" path in tsconfig.json and the docs alias in
// docs/vite.docs.config.ts). It is named api rather than index because the
// project does not use index.* modules: a re-export surface should say what it
// is. Its own re-exports are grouped below by the layer they come from.
//
// Usage:
//   import { Replot, Dot, Line, BarY, AxisX, AxisY } from "@dave-hillier/replot/react";
//
//   function Chart({ data }) {
//     return (
//       <Replot width={640} height={400}>
//         <Dot data={data} x="weight" y="height" fill="species" />
//         <AxisX />
//         <AxisY />
//       </Replot>
//     );
//   }

// Root component
export {Replot, Replot as Plot} from "./Replot.js";
export type {ReplotProps, ReplotProps as PlotProps} from "./Replot.js";

// Context (for advanced usage / custom marks)
export {PlotContext, usePlotContext} from "./PlotContext.js";
export type {PlotContextValue, Dimensions} from "./PlotContext.js";

// Core hook (for building custom marks)
export {useMark, stampOptions} from "./useMark.js";
export type {
  UseMarkOptions,
  MarkFactory,
  MarkEventHandlers,
  MarkMouseEventHandler,
  MarkPointerEventHandler
} from "./useMark.js";

// Style utilities (for building custom marks)
export {
  indirectStyleProps,
  directStyleProps,
  channelStyleProps,
  groupChannelStyleProps,
  computeTransform,
  computeFrameAnchor,
  resolveStyles
} from "./styles.js";

// Per-datum element identity (for building custom marks): tag the element a
// custom mark renders for a datum so that the datum reaches its handlers.
export {withDatumIndex} from "./perDatum.js";

// Mark components
export {Dot, DotX, DotY, Circle, Hexagon} from "./marks/Dot.js";
export type {DotProps, DotXProps, DotYProps, CircleProps, HexagonProps} from "./marks/Dot.js";

export {Line, LineX, LineY} from "./marks/Line.js";
export type {LineProps, LineXProps, LineYProps} from "./marks/Line.js";

export {Area, AreaX, AreaY} from "./marks/Area.js";
export type {AreaProps, AreaXProps, AreaYProps} from "./marks/Area.js";

export {BarX, BarY} from "./marks/Bar.js";
export type {BarXProps, BarYProps} from "./marks/Bar.js";

export {Rect, Cell, CellX, CellY, RectX, RectY} from "./marks/Rect.js";
export type {RectProps, RectXProps, RectYProps, CellProps} from "./marks/Rect.js";

export {RuleX, RuleY} from "./marks/Rule.js";
export type {RuleXProps, RuleYProps} from "./marks/Rule.js";

export {Text, TextX, TextY} from "./marks/Text.js";
export type {TextProps, TextXProps, TextYProps} from "./marks/Text.js";

export {Frame} from "./marks/Frame.js";
export type {FrameProps} from "./marks/Frame.js";

export {TickX, TickY} from "./marks/Tick.js";
export type {TickXProps, TickYProps} from "./marks/Tick.js";

export {Link} from "./marks/Link.js";
export type {LinkProps} from "./marks/Link.js";

export {Arrow} from "./marks/Arrow.js";
export type {ArrowProps} from "./marks/Arrow.js";

export {Vector, VectorX, VectorY, Spike} from "./marks/Vector.js";
export type {VectorProps} from "./marks/Vector.js";

export {Image} from "./marks/Image.js";
export type {ImageProps} from "./marks/Image.js";

// Geometric / computational marks
export {Geo, Sphere, Graticule} from "./marks/Geo.js";
export type {GeoProps, SphereProps, GraticuleProps} from "./marks/Geo.js";

export {DelaunayLink, DelaunayMesh, Hull, Voronoi, VoronoiMesh} from "./marks/Delaunay.js";
export type {DelaunayProps} from "./marks/Delaunay.js";

export {Density} from "./marks/Density.js";
export type {DensityProps} from "./marks/Density.js";

export {Contour} from "./marks/Contour.js";
export type {ContourProps} from "./marks/Contour.js";

export {Raster} from "./marks/Raster.js";
export type {RasterProps} from "./marks/Raster.js";

// Raster interpolation utilities (pure functions, shared with imperative API)
export {interpolateNone, interpolatorBarycentric, interpolateNearest, interpolatorRandomWalk} from "../marks/raster.js";

export {Hexgrid} from "./marks/Hexgrid.js";
export type {HexgridProps} from "./marks/Hexgrid.js";

// Composite marks
export {BoxX, BoxY} from "./marks/Box.js";
export type {BoxXProps, BoxYProps} from "./marks/Box.js";

export {TreeMark, ClusterMark} from "./marks/Tree.js";
export type {TreeProps} from "./marks/Tree.js";

export {Auto} from "./marks/Auto.js";
export type {AutoProps} from "./marks/Auto.js";

export {BollingerX, BollingerY} from "./marks/Bollinger.js";
export type {BollingerXProps, BollingerYProps} from "./marks/Bollinger.js";

export {DifferenceX, DifferenceY} from "./marks/Difference.js";
export type {DifferenceProps} from "./marks/Difference.js";

export {LinearRegressionX, LinearRegressionY} from "./marks/LinearRegression.js";
export type {LinearRegressionXProps, LinearRegressionYProps} from "./marks/LinearRegression.js";

export {WaffleX, WaffleY} from "./marks/Waffle.js";
export type {WaffleXProps, WaffleYProps} from "./marks/Waffle.js";

// Axis and grid components (including facet axes)
export {AxisX, AxisY, GridX, GridY, AxisFx, AxisFy, GridFx, GridFy} from "./marks/Axis.js";
export type {AxisXProps, AxisYProps, GridXProps, GridYProps} from "./marks/Axis.js";

// Scale components (plot-level scale options declared as JSX; the
// object-literal props on <Plot> remain supported and win on conflict)
export {
  ScaleX,
  ScaleY,
  ScaleColor,
  ScaleOpacity,
  ScaleR,
  ScaleSymbol,
  ScaleLength,
  ScaleFx,
  ScaleFy,
  ScaleFacet,
  ScaleProjection
} from "./scales/Scale.js";
export type {
  ScaleXProps,
  ScaleYProps,
  ScaleColorProps,
  ScaleOpacityProps,
  ScaleRProps,
  ScaleSymbolProps,
  ScaleLengthProps,
  ScaleFxProps,
  ScaleFyProps,
  ScaleFacetProps,
  ScaleProjectionProps
} from "./scales/Scale.js";

// Legend components
export {Legend} from "./legends/Legend.js";
export type {LegendProps} from "./legends/Legend.js";

// Interaction components
export {Tip} from "./interactions/Tip.js";
export type {TipProps} from "./interactions/Tip.js";

export {Crosshair, CrosshairX, CrosshairY} from "./interactions/Crosshair.js";
export type {CrosshairProps} from "./interactions/Crosshair.js";

// Transform components (wrappers composing via TransformContext)
export {TransformContext, useTransformContext} from "./TransformContext.js";
export type {TransformContextValue} from "./TransformContext.js";
export {StackX, StackX1, StackX2, StackY, StackY1, StackY2} from "./transforms/Stack.js";
export type {
  StackXProps,
  StackX1Props,
  StackX2Props,
  StackYProps,
  StackY1Props,
  StackY2Props
} from "./transforms/Stack.js";
export {Bin, BinX, BinY} from "./transforms/Bin.js";
export type {BinProps, BinXProps, BinYProps} from "./transforms/Bin.js";
export {Group, GroupX, GroupY, GroupZ} from "./transforms/Group.js";
export type {GroupProps, GroupXProps, GroupYProps, GroupZProps} from "./transforms/Group.js";
export {WindowX, WindowY} from "./transforms/Window.js";
export type {WindowXProps, WindowYProps} from "./transforms/Window.js";
export {NormalizeX, NormalizeY} from "./transforms/Normalize.js";
export type {NormalizeXProps, NormalizeYProps} from "./transforms/Normalize.js";
export {MapX, MapY} from "./transforms/Map.js";
export type {MapXProps, MapYProps} from "./transforms/Map.js";
export {ShiftX, ShiftY} from "./transforms/Shift.js";
export type {ShiftXProps, ShiftYProps} from "./transforms/Shift.js";
export {SelectFirst, SelectLast, SelectMinX, SelectMinY, SelectMaxX, SelectMaxY} from "./transforms/Select.js";
export type {
  SelectFirstProps,
  SelectLastProps,
  SelectMinXProps,
  SelectMinYProps,
  SelectMaxXProps,
  SelectMaxYProps
} from "./transforms/Select.js";
export {DodgeX, DodgeY} from "./transforms/Dodge.js";
export type {DodgeXProps, DodgeYProps} from "./transforms/Dodge.js";
export {Hexbin} from "./transforms/Hexbin.js";
export type {HexbinProps} from "./transforms/Hexbin.js";
export {Centroid, GeoCentroid} from "./transforms/Centroid.js";
export type {CentroidProps, GeoCentroidProps} from "./transforms/Centroid.js";

// Re-export ALL transforms (pure functions, shared with imperative API)
// Bare `filter`, `map`, and `window` shadow the JS/DOM globals when imported
// unaliased; they stay exported for Observable Plot compatibility, but the
// aliases `filterTransform`, `mapTransform`, and `windowMap` are preferred
// from this entry point.
export {
  filter,
  filter as filterTransform,
  reverse,
  sort,
  shuffle,
  basic as transform,
  initializer
} from "../transforms/basic.js";
export {bin, binX, binY} from "../transforms/bin.js";
export {centroid, geoCentroid} from "../transforms/centroid.js";
export {dodgeX, dodgeY} from "../transforms/dodge.js";
export {group, groupX, groupY, groupZ, find} from "../transforms/group.js";
export {hexbin} from "../transforms/hexbin.js";
export {normalize, normalizeX, normalizeY} from "../transforms/normalize.js";
export {map, map as mapTransform, mapX, mapY} from "../transforms/map.js";
export {shiftX, shiftY} from "../transforms/shift.js";
export {window, window as windowMap, windowX, windowY} from "../transforms/window.js";
export {select, selectFirst, selectLast, selectMaxX, selectMaxY, selectMinX, selectMinY} from "../transforms/select.js";
export {stackX, stackX1, stackX2, stackY, stackY1, stackY2} from "../transforms/stack.js";
export {treeNode, treeLink} from "../transforms/tree.js";
export {pointer, pointerX, pointerY} from "../interactions/pointer.js";

// Re-export mark-related utilities (pure functions, shared with imperative API)
export {bollinger} from "../marks/bollinger.js";
export {auto, autoSpec} from "../marks/auto.js";

// Re-export data utilities
export {valueof, column, identity, indexOf, numberInterval} from "../options.js";

// Re-export format utilities
export {formatIsoDate, formatNumber, formatWeekday, formatMonth} from "../format.js";

// Re-export scale and legend utilities
export {scale} from "../scales.js";
export {legend} from "../legends.js";

// Re-export time interval utilities
export {timeInterval, utcInterval} from "../time.js";
