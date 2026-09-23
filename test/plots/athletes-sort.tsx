import {Replot, BarX, Frame, Dot, TickX, groupZ, groupY, sort as sortTransform} from "../../src/react/api.js";
import * as d3 from "d3";

export async function athletesSortFacet() {
  const athletes = await d3.csv<{sex: string; sport: string}>("data/athletes.csv", d3.autoType);
  const female = (d: (typeof athletes)[number]) => d.sex === "female";
  return (
    <Replot marginLeft={100}>
      <BarX data={athletes} {...groupZ({x: "mean"}, {x: female, fy: "sport", sort: {fy: "x"}})} />
      <Frame anchor="left" facet="super" />
    </Replot>
  );
}

export async function athletesSortNationality() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot legend>
      <Dot
        data={athletes}
        {...sortTransform("height", {
          y: "weight",
          x: "height",
          stroke: "nationality",
          sort: {color: null, limit: 10}
        })}
      />
    </Replot>
  );
}

export async function athletesSortNullLimit() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot legend>
      <Dot data={athletes} x="height" y="weight" stroke="nationality" sort={{color: null, limit: 10}} />
    </Replot>
  );
}

export async function athletesSortWeightLimit() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot>
      <Dot data={athletes} x="weight" y="nationality" sort={{y: "x", reduce: "median", limit: 10}} />
      <TickX
        data={athletes}
        {...groupY({x: "median"}, {x: "weight", y: "nationality", stroke: "red", strokeWidth: 2})}
      />
    </Replot>
  );
}
