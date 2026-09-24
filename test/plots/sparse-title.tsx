import {Replot, Dot, Tip, pointer} from "../../src/react/api.js";
import * as d3 from "d3";

export async function sparseTitle() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot grid>
      <Dot
        data={olympians}
        x="weight"
        y="height"
        fy="sex"
        sort={(d) => !!d.info}
        fill={(d) => (d.info ? "currentColor" : "#aaa")}
        stroke="white"
        strokeWidth={0.25}
        title={(d) => (d.info ? [(d.name, d.info)].join("\n\n") : undefined)}
      />
    </Replot>
  );
}

export async function sparseTitleTip() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot grid>
      <Dot
        data={olympians}
        x="weight"
        y="height"
        fy="sex"
        sort={(d) => !!d.info}
        stroke={(d) => (d.info ? "currentColor" : "#aaa")}
      />
      <Tip
        data={olympians}
        {...pointer({
          x: "weight",
          y: "height",
          fy: "sex",
          title: (d) => (d.info ? [(d.name, d.info)].join("\n\n") : undefined)
        })}
      />
    </Replot>
  );
}
