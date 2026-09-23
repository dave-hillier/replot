import {Replot, DotX, select} from "../../src/react/api.js";
import * as d3 from "d3";

export async function athletesSample() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot marginLeft={100} x={{grid: true}} color={{scheme: "dark2"}}>
      <DotX
        data={athletes}
        {...select((I) => I.filter((i) => i % 100 === 0), {
          x: "weight",
          y: "sport",
          fill: "sex",
          r: 5,
          title: "name"
        })}
      />
    </Replot>
  );
}

export async function athletesSampleFacet() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot x={{grid: true}} color={{scheme: "dark2"}} facet={{marginLeft: 100}}>
      <DotX
        data={athletes}
        {...select((I) => I.filter((i) => i % 100 === 0), {
          x: "weight",
          fy: "sport",
          fill: "sex",
          r: 5,
          title: "name"
        })}
      />
    </Replot>
  );
}
