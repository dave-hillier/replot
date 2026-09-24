import {Replot, BarY, groupX} from "../../src/react/api.js";

export async function shorthandGroupBarY() {
  const gene = "AAAAGAGTGAAGATGCTGGAGACGAGTGAAGCATTCACTTTAGGGAAAGCGAGGCAAGAGCGTTTCAGAAGACGAAACCTGGTAGGTGCACTCACCACAG";
  return (
    <Replot>
      <BarY data={gene} {...groupX()} />
    </Replot>
  );
}
