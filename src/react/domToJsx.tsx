import {createElement as h, Fragment, type ReactNode} from "react";

// Converts a detached DOM node (as produced by htl's svg`…` in a function
// mark) into React elements, so the JSX render paths can inline raw SVG —
// e.g. <defs> with gradients or patterns — without touching the live DOM.

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const DOCUMENT_FRAGMENT_NODE = 11;

export function isDomNode(value: unknown): value is Node {
  return value != null && typeof value === "object" && typeof (value as Node).nodeType === "number";
}

export function domToJsx(node: Node, key?: string | number): ReactNode {
  switch (node.nodeType) {
    case ELEMENT_NODE: {
      const element = node as Element;
      const props: Record<string, unknown> = {key};
      for (const {name, value} of element.attributes) props[reactAttributeName(name)] = attributeValue(name, value);
      const children = [...element.childNodes].map((child, i) => domToJsx(child, i));
      return h(element.tagName, props, ...children);
    }
    case TEXT_NODE:
      return node.nodeValue;
    case DOCUMENT_FRAGMENT_NODE:
      return h(Fragment, {key}, ...[...node.childNodes].map((child, i) => domToJsx(child, i)));
  }
  return null; // comments, processing instructions, …
}

function reactAttributeName(name: string): string {
  if (name === "class") return "className";
  if (name === "for") return "htmlFor";
  // Hyphenated presentation attributes (stroke-width, paint-order, …) map to
  // React's camelCase props — React serializes them back to the hyphenated
  // form but warns on the hyphenated spelling. aria-*/data-* and namespaced
  // attributes pass through verbatim.
  if (/^[a-z]+(-[a-z]+)+$/.test(name) && !name.startsWith("aria-") && !name.startsWith("data-")) {
    return camelCase(name);
  }
  return name;
}

// React requires the style prop to be an object; other attributes pass
// through verbatim (React renders unrecognized attributes as-is).
function attributeValue(name: string, value: string): unknown {
  return name === "style" ? parseStyleString(value) : value;
}

// Parses a CSS declaration list — the value of a style attribute, or the plot's
// style option when it is given as a string — into the object React wants for
// the style prop. Custom properties are kept verbatim, everything else is
// camelCased, which is what React expects and what it serializes back.
export function parseStyleString(style: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const declaration of style.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue;
    const property = declaration.slice(0, colon).trim();
    if (!property) continue;
    parsed[property.startsWith("--") ? property : camelCase(property)] = declaration.slice(colon + 1).trim();
  }
  return parsed;
}

function camelCase(property: string): string {
  return property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
