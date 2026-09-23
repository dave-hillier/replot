import {Replot, Cell, CellX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function shorthandCell() {
  const matrix = [
    ["Jacob", "Olivia"],
    ["Mia", "Noah"],
    ["Noah", "Ava"],
    ["Ava", "Mason"],
    ["Olivia", "Noah"],
    ["Jacob", "Emma"],
    ["Ava", "Noah"],
    ["Noah", "Jacob"],
    ["Olivia", "Ava"],
    ["Mason", "Emma"],
    ["Jacob", "Mia"],
    ["Mia", "Jacob"],
    ["Emma", "Jacob"]
  ];
  return (
    <Replot>
      <Cell data={matrix} />
    </Replot>
  );
}

export async function shorthandCellCategorical() {
  return (
    <Replot color={{scheme: "Tableau10"}}>
      <CellX data={d3.range(10)} />
    </Replot>
  );
}
