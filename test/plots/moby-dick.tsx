import {Replot, Text} from "../../src/react/api.js";
import * as d3 from "d3";

export async function mobyDick() {
  const mobydick = await d3.text("data/moby-dick-chapter-1.txt");
  return (
    <Replot height={1200}>
      <Text data={[mobydick]} fontSize={14} lineWidth={40} lineHeight={1.2} frameAnchor="top-left" />
    </Replot>
  );
}
