import {Replot, RectY, binX} from "../../src/react/api.js";
import * as Arrow from "apache-arrow";
import * as d3 from "d3";

export async function arrowDates() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  const table = Arrow.tableFromJSON(athletes);
  return (
    <Replot>
      <RectY data={table} {...binX(undefined, {x: "date_of_birth"})} />
    </Replot>
  );
}
