import {useState, type ReactNode} from "react";
import {Replot} from "../../src/react/index.js";

// Upstream's viewof idiom, in React. Its pointer test plots
// (observablehq-plot test/plots/pointer.ts and arrow.ts) put the plot and a
// <textarea> in a <figure>, then refresh the textarea from `plot.value` on
// every `input` event the pointer transform dispatches. Here the <Replot
// onValue> prop reports those same value changes and ordinary state carries
// them to the textarea, so nothing reaches for a DOM handle.
//
// Deliberately NOT listed in ./index.ts: that module's exports are each run as
// a test plot, and this one is a component.
export function PointerViewof({title, children}: {title?: string; children: ReactNode}) {
  const [value, setValue] = useState<unknown>(null);
  const text = value == null ? "" : JSON.stringify(value, null, 2);
  return (
    <figure>
      <Replot title={title} onValue={setValue}>
        {children}
      </Replot>
      {/* Uncontrolled, and remounted by its key whenever the focused datum
          changes. Upstream assigns `textarea.value`, which never reflects into
          the serialized markup — its baseline shows an empty box — whereas a
          CONTROLLED textarea renders its value as the element's text and needs
          a readOnly (or an onChange) to be accepted, so it would diverge from
          upstream's DOM in two ways at rest. The box is empty until something
          is focused, exactly as upstream's is: JSON.stringify(plot.value) is
          undefined before the first pointer event. */}
      <textarea key={text} rows={10} style={{width: "640px", resize: "none"}} defaultValue={text} />
    </figure>
  );
}
