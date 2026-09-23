import {Replot, RuleY, LineY, Arrow, groupX, find} from "../../src/react/api.js";
import * as d3 from "d3";

export async function findArrow() {
  const ages = ["Y16-19", "Y20-24", "Y25-29"];
  const sexes = ["M", "F"];
  const ilc = await d3.csv<any>("data/ilc_lvps08.csv", (d) =>
    d.geo === "EL" && sexes.includes(d.sex) && ages.includes(d.age) ? d3.autoType(d) : null
  );
  return (
    <Replot
      x={{tickFormat: "", label: null, inset: 10}}
      y={{grid: true, label: "Greek youth living with parents (%, ↑more male, ↓more female)"}}
      color={{legend: true}}
    >
      <RuleY data={[0, 100]} />
      <LineY data={ilc} filter={(d) => d.sex === "F"} x="TIME_PERIOD" y="OBS_VALUE" stroke="age" strokeOpacity={0.2} />
      <LineY data={ilc} filter={(d) => d.sex === "M"} x="TIME_PERIOD" y="OBS_VALUE" stroke="age" />
      <Arrow
        data={ilc}
        {...groupX(
          {y1: find((d) => d.sex === "F"), y2: find((d) => d.sex === "M")},
          {x: "TIME_PERIOD", y: "OBS_VALUE", stroke: "age", bend: true}
        )}
      />
    </Replot>
  );
}
