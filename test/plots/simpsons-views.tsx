import {Replot, RuleY, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function simpsonsViews() {
  const data = await d3.csv<any>("data/simpsons.csv", d3.autoType);
  return (
    <Replot
      height={640}
      grid
      x={{
        inset: 6,
        label: "IMDb rating"
      }}
      y={{
        label: "Viewers (U.S., millions)"
      }}
      color={{
        type: "quantize",
        legend: true
      }}
    >
      <RuleY data={[0]} />
      <Dot
        data={data}
        x="imdb_rating"
        y="us_viewers_in_millions"
        fill="season"
        title={(d) => `${d.title} S${d.season}E${d.number_in_season}`}
      />
    </Replot>
  );
}
