// JSX wrappers for the title and href channels. These emit React elements
// rather than returning prop objects (which is what styles.ts does), so they
// live in a .tsx file. Marks porting their imperative render() to renderJSX
// import from here for the channel-driven <title> child and <a> wrapper.

import type {ReactNode} from "react";
import {nonempty} from "../defined.js";
import {formatDefault} from "../format.js";

type Channel<T> = ArrayLike<T> | undefined;

// Returns a <title> child if a title channel has a non-empty value at index i.
// Pass any pre-existing children alongside; the title is rendered as a sibling.
// When the mark has a tip, the title is omitted (as upstream's
// applyChannelStyles does): the tip displays it, and a native <title> tooltip
// would otherwise compete with it on hover.
export function withTitleChild(
  mark: {tip?: unknown},
  channels: {title?: Channel<string>},
  i: number,
  children?: ReactNode
): ReactNode {
  if (mark.tip) return children;
  const T = channels.title;
  if (!T) return children;
  const v = T[i];
  if (!nonempty(v)) return children;
  return (
    <>
      <title>{formatDefault(v)}</title>
      {children}
    </>
  );
}

// Wraps the given node with an <a href={...}> if a href channel has a value at
// index i. Otherwise returns the node unchanged. SVG <a> accepts a fill
// attribute that React's HTML anchor types do not, so we cast to any.
export function withHrefWrap(
  channels: {href?: Channel<string>},
  target: string | undefined,
  i: number,
  node: ReactNode
): ReactNode {
  const H = channels.href;
  if (!H) return node;
  const h = H[i];
  if (h == null) return node;
  const anchorProps: any = {href: h, fill: "inherit"};
  if (target != null) anchorProps.target = target;
  return (
    <a key={i} {...anchorProps}>
      {node}
    </a>
  );
}
