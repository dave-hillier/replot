import React, {type ReactNode, type RefObject} from "react";
import {domToJsx, isDomNode} from "./domToJsx.js";

// Document-layout half of <Plot>: wraps the rendered plot in a <figure> with
// optional <h2> title, <h3> subtitle, legends, and a <figcaption>, mirroring
// the imperative plot()'s figure structure (figure > h2/h3 > div.plot-host >
// svg > figcaption). <Plot> owns the decision of WHETHER to render a figure
// (see its `figure` prop); this component owns the structure once that's
// decided, keeping document layout separate from scale computation.
export interface FigureLayoutProps {
  title?: string;
  subtitle?: string;
  caption?: string;
  autoLegends: ReactNode;
  explicitLegends: ReactNode;
  plotElement: ReactNode;
  // When the plot rendered as a JSX <svg>, wrap it in div.plot-host to match
  // the imperative structure; the imperatively-mounted host is already a div.
  isJsx: boolean;
  // <Plot> reports the pointer selection on the plot's root element (upstream's
  // context.dispatchValue), which is this <figure> whenever there is one, so it
  // needs a handle on it. Its own layout effect reads this ref, which React has
  // attached by then: a child's host refs attach before a parent's effects run.
  figureRef?: RefObject<HTMLElement | null>;
}

export function FigureLayout({
  title,
  subtitle,
  caption,
  autoLegends,
  explicitLegends,
  plotElement,
  isJsx,
  figureRef
}: FigureLayoutProps) {
  return (
    <figure ref={figureRef} style={{maxWidth: "initial"}}>
      {title != null && <SlotHeader as="h2" content={title} />}
      {subtitle != null && <SlotHeader as="h3" content={subtitle} />}
      {autoLegends}
      {explicitLegends}
      {isJsx ? <div className="plot-host">{plotElement}</div> : plotElement}
      {caption != null && <SlotHeader as="figcaption" content={caption} />}
      {/* The figure's trailing hidden div is part of its established DOM
          shape (asserted by the rendering snapshots). The registration
          children themselves live OUTSIDE the figure, at a stable position
          in <Plot>, so that figure-mode changes don't remount them; this
          placeholder stays empty. */}
      <div style={{display: "none"}} />
    </figure>
  );
}

// Renders a title/subtitle/caption slot. Content is usually a string but may be
// a DOM Node (e.g. an HTML title built imperatively) or a React element; either
// way it is rendered as an ordinary React child. A DOM node is converted to
// elements from its markup rather than mounted by hand: React cannot render a
// node as a child, and mounting it in a layout effect (replaceChildren) would
// take the slot's contents out of React's hands — it detaches the text node
// React itself put there, so React keeps updating a node nobody can see, and it
// moves a caller's node out of its own parent.
function SlotHeader({as: Tag, content, style: styleProp}: {as: any; content: any; style?: any}) {
  return <Tag style={styleProp}>{isDomNode(content) ? domToJsx(content) : content}</Tag>;
}
