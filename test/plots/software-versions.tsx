import {Replot, BarX, Text, RuleX, stackX, groupZ} from "../../src/react/api.js";
import * as d3 from "d3";

export async function softwareVersions() {
  const data = await d3.csv<any>("data/software-versions.csv");

  function stack({text = undefined, fill = undefined, ...options}) {
    return stackX({
      ...groupZ(
        {
          x: "proportion",
          text: "first"
        },
        {
          z: "version",
          order: "value",
          text,
          fill
        }
      ),
      reverse: true,
      ...options
    });
  }

  return (
    <Replot
      x={{
        percent: true
      }}
      color={{
        type: "ordinal",
        scheme: "blues"
      }}
    >
      <BarX data={data} {...stack({fill: "version", insetLeft: 0.5, insetRight: 0.5})} />
      <Text data={data} {...stack({text: "version"})} />
      <RuleX data={[0, 1]} />
    </Replot>
  );
}
