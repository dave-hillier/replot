import {Replot, BarX, TextX, RuleX, groupY, formatMonth} from "../../src/react/api.js";
import * as d3 from "d3";

export async function athletesBirthdays() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot
      marginRight={40}
      y={{
        tickFormat: formatMonth()
      }}
    >
      <BarX data={athletes} {...groupY({x: "count"}, {y: (d) => d.date_of_birth.getUTCMonth()})} />
      <TextX
        data={athletes}
        {...groupY({x: "count", text: "count"}, {y: (d) => d.date_of_birth.getUTCMonth(), dx: 4, frameAnchor: "left"})}
      />
      <RuleX data={[0]} />
    </Replot>
  );
}
