import {Replot, RuleX, Line, Dot, groupX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function simpsonsRatingsDots() {
  const simpsons = await d3.csv<any>("data/simpsons.csv", d3.autoType);
  return (
    <Replot
      x={{
        type: "point",
        label: "Season",
        labelAnchor: "right",
        labelArrow: true
      }}
      y={{
        label: "IMDb rating"
      }}
    >
      <RuleX data={simpsons} {...groupX({y1: "min", y2: "max"}, {x: "season", y: "imdb_rating"})} />
      <Line data={simpsons} {...groupX({y: "median"}, {x: "season", y: "imdb_rating", stroke: "red"})} />
      <Dot data={simpsons} x="season" y="imdb_rating" />
    </Replot>
  );
}
