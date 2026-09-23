import {Replot, Dot, dodgeY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function moviesRatingByGenre() {
  const movies = await d3.json<any>("data/movies.json");
  return (
    <Replot
      width={960}
      height={560}
      x={{
        axis: "top",
        grid: true,
        domain: [0, 10]
      }}
      fy={{
        grid: true,
        tickFormat: (d) => d ?? "N/A",
        label: null,
        padding: 0
      }}
      facet={{
        data: movies,
        y: "Major Genre",
        marginLeft: 120
      }}
    >
      <Dot
        data={movies}
        {...dodgeY(
          {
            anchor: "middle",
            padding: -2
          },
          {
            x: "IMDB Rating",
            stroke: "Major Genre",
            r: 2.5,
            sort: {
              fy: "-x",
              reduce: "median"
            }
          }
        )}
      />
    </Replot>
  );
}
