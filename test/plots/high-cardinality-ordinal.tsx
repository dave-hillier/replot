import {Replot, CellX} from "../../src/react/api.js";

export async function highCardinalityOrdinal() {
  return (
    <Replot color={{type: "ordinal"}}>
      <CellX data="ABCDEFGHIJKLMNOPQRSTUVWXYZ" />
    </Replot>
  );
}
