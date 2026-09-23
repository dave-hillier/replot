import {Replot, Text} from "../../src/react/api.js";

export async function hrefFill() {
  return (
    <Replot>
      <Text
        data={{length: 1}}
        text={["click me"]}
        x={0}
        y={0}
        fill="red"
        href={[`https://google.com/search?q=12345`]}
      />
    </Replot>
  );
}
