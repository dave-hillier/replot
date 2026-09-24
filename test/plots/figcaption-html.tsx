import {Replot, BarY, RuleY} from "../../src/react/api.js";
import * as d3 from "d3";
import {html} from "htl";

export async function figcaptionHtml() {
  const alphabet = await d3.csv<any>("data/alphabet.csv", d3.autoType);
  return (
    <Replot
      caption={html`Figure 1. The relative frequency of letters in the English language. Data:
        <i>Cryptographical Mathematics</i>`}
      x={{
        label: null
      }}
      y={{
        label: "Frequency (%)",
        transform: (y) => y * 100,
        grid: true
      }}
    >
      <BarY data={alphabet} x="letter" y="frequency" />
      <RuleY data={[0]} />
    </Replot>
  );
}
