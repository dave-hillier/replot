import {createElement as h, Fragment, type ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {domToJsx, isDomNode} from "./domToJsx.js";

// Bridges the imperative `render` option (a render transform: DOM in, DOM
// out) into the JSX render paths. The Mark constructor composes
// options.render into an own `render` property — marks define no imperative
// render of their own anymore — so an own function marks a user transform. A
// mark with a custom renderJSX is excluded, since that takes precedence on the
// JSX paths.
export function hasRenderTransform(mark: any): boolean {
  return typeof userRenderOf(mark) === "function" && !Object.prototype.hasOwnProperty.call(mark, "renderJSX");
}

// The transform to actually run. For a pointer-wrapped mark, `mark.render` is
// pointer.js's composed closure — the one that attaches its own listeners and
// owns its own focused index — which the React path never executes, because it
// reimplements the interaction over the pure helpers. Composing the user's own
// render inside it (composeRender, pointer.js:213) would otherwise bury it, so
// pointer.js records it separately as `render.userRender` and that is what runs
// here, with the pointer's selection already substituted into `index` by
// <PointerMarkSlot>.
export function userRenderOf(mark: any): unknown {
  const render = mark?.render;
  if (typeof render !== "function") return null;
  return render.pointer === true ? render.userRender : render;
}

// Executes the composed render transform with a `next` that produces the
// mark's default output as a detached DOM node, honoring the imperative
// contract (index, scales, values, dimensions, context, next). The result is
// converted back to JSX so both the interactive and static paths can inline
// it.
export function renderTransformJSX(
  mark: any,
  index: any,
  scales: any,
  values: any,
  dimensions: any,
  context: any
): ReactNode {
  const next = (i: any, s: any, v: any, d: any, c: any = context) => {
    const jsx = mark.renderJSX(i, s, v, d, c);
    return jsx == null ? null : isDomNode(jsx) ? jsx : jsxToDom(jsx, c.document);
  };
  const render = userRenderOf(mark) as (...args: any[]) => unknown;
  const out = render.call(mark, index, scales, values, dimensions, context, next);
  if (out == null) return null;
  return isDomNode(out) ? domToJsx(out) : (out as ReactNode);
}

// Serializes a JSX tree and reparses it in an <svg> context so the resulting
// nodes carry the SVG namespace, mirroring how renderStatic.tsx serializes
// the whole plot for the imperative entry point.
function jsxToDom(jsx: ReactNode, document: Document): Node | null {
  const holder = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  holder.innerHTML = renderToStaticMarkup(h(Fragment, null, jsx));
  if (holder.childNodes.length === 1) {
    const node = holder.firstChild!;
    holder.removeChild(node);
    return node;
  }
  const fragment = document.createDocumentFragment();
  while (holder.firstChild) fragment.appendChild(holder.firstChild);
  return fragment;
}
