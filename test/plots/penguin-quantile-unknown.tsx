import {Replot, TickX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinQuantileUnknown() {
  const sample = (await d3.csv<any>("data/penguins.csv", d3.autoType)).map((d, i) => ({
    ...d,
    body_mass_g: i % 7 === 0 ? NaN : d.body_mass_g
  }));
  return (
    <Replot color={{type: "quantile", n: 5, scheme: "blues", unknown: "red", legend: true}}>
      <TickX data={sample} x="culmen_length_mm" stroke="body_mass_g" />
    </Replot>
  );
}

export async function penguinQuantileEmpty() {
  const sample = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot color={{type: "quantile", n: 5, scheme: "blues", unknown: "red"}}>
      <TickX data={sample} x="culmen_length_mm" stroke={() => null} />
    </Replot>
  );
}
