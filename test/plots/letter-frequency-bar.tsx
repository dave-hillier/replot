import {Replot, BarX, RuleX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function letterFrequencyBar() {
  const alphabet = await d3.csv<any>("data/alphabet.csv", d3.autoType);
  return (
    <Replot
      ariaLabel="letter-frequency chart"
      ariaDescription="A horizontal bar chart showing the relative frequency of letters in the English language."
      x={{label: "Frequency (%)", transform: (x) => x * 100, grid: true}}
      y={{label: null}}
      height={580}
    >
      <BarX
        data={alphabet}
        x="frequency"
        y="letter"
        ariaLabel={(
          (f) => (d) =>
            `${d.letter} ${f(d.frequency)}`
        )(d3.format(".1%"))}
        sort={{y: "x"}}
      />
      <RuleX data={[0]} ariaHidden="true" />
    </Replot>
  );
}
