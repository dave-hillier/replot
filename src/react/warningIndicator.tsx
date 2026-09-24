import {Children, cloneElement, type ReactElement, type ReactNode} from "react";

// The ⚠️ warning indicator a plot draws in its top-right corner when rendering
// it raised warnings. It has one definition, used by both entry points: the
// imperative plot() appends it to the <svg> element it has just built
// (src/plot.ts, via withWarningIndicator below), and the React path renders it
// as the last child of its <svg> (<WarningIndicator> in Replot.tsx).
//
// Last child, because that is where upstream appends it (plot.js:346-356) and
// the snapshot baselines were built against that order.
//
// font-family="initial" is upstream's fix for emoji rendering in Chrome
// (plot.js:352); the count is drained, not live, which is why callers must
// drain after their marks have rendered.
export function warningIndicatorElement(computed: any, warnings: number): ReactNode {
  if (!(warnings > 0)) return null;
  const {width} = computed.dimensions;
  return (
    <text x={width} y={20} dy="-1em" textAnchor="end" fontFamily="initial">
      {"⚠️"}
      <title>{`${warnings.toLocaleString("en-US")} warning${
        warnings === 1 ? "" : "s"
      }. Please check the console.`}</title>
    </text>
  );
}

// The indicator appended to an <svg> element that has already been built, the
// shape the imperative path needs: its marks render (and so raise their
// warnings) while that element is being built, so the drain cannot come
// earlier, and the legends are built after it, so the drain cannot come later
// either. Returns the element unchanged when there is nothing to draw, so an
// unwarned plot's <svg> is untouched.
export function withWarningIndicator(svg: ReactElement, computed: any, warnings: number): ReactElement {
  const indicator = warningIndicatorElement(computed, warnings);
  if (indicator == null) return svg;
  return cloneElement(svg as any, undefined, ...Children.toArray((svg.props as any).children), indicator);
}
