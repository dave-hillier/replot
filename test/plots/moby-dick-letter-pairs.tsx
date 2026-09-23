import {Replot, BarX, Text, groupY, stackX, group} from "../../src/react/api.js";
import * as d3 from "d3";

export async function mobyDickLetterPairs() {
  const mobydick = await d3.text("data/moby-dick-chapter-1.txt");
  const letters = [...mobydick].map((d) => (/\w/.test(d) ? d.toUpperCase() : "*"));
  const pairs = d3.pairs(letters).map(([letter, next]) => ({letter, next}));
  return (
    <Replot x={{axis: null}} y={{label: null}}>
      <BarX data={pairs} {...groupY({x: "distinct"}, {x: "next", y: "letter"})} />
      <Text
        data={pairs}
        {...stackX(
          group(
            {
              text: "first",
              y: "first",
              x: "distinct",
              sort: "x"
            },
            {
              y: "letter",
              z: "next",
              x: "next",
              text: "next",
              fill: "white"
            }
          )
        )}
      />
    </Replot>
  );
}
