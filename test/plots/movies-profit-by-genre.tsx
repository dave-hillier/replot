import {Replot, RuleX, BarX, Dot, TickX, groupY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function moviesProfitByGenre() {
  const movies = await d3.json<any>("data/movies.json");
  const Genre = (d) => d["Major Genre"] || "Other";
  const Profit = (d) => (d["Worldwide Gross"] - d["Production Budget"]) / 1e6;
  return (
    <Replot
      marginLeft={120}
      x={{
        grid: true,
        inset: 6,
        label: "Profit ($M)",
        domain: [d3.min(movies, Profit), 1e3]
      }}
    >
      <RuleX data={[0]} />
      <BarX
        data={movies}
        {...groupY(
          {x1: "p25", x2: "p75"},
          {
            y: Genre,
            x: Profit,
            fillOpacity: 0.2
          }
        )}
      />
      <Dot data={movies} y={Genre} x={Profit} strokeWidth={1} />
      <TickX
        data={movies}
        {...groupY(
          {x: "median"},
          {
            y: Genre,
            x: Profit,
            stroke: "red",
            strokeWidth: 2,
            sort: {y: "-x"}
          }
        )}
      />
    </Replot>
  );
}
