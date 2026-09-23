import {Replot, RuleY, Line, Text, normalizeY, selectLast} from "../../src/react/api.js";
import * as d3 from "d3";

const format = d3.format("+d");

function formatChange(x) {
  return format((x - 1) * 100);
}

async function loadSymbol(name) {
  const Symbol = name.toUpperCase();
  return d3.csv(`data/${name}.csv`, (d) => ({Symbol, ...d3.autoType(d)}));
}

export async function stocksIndex() {
  const stocks = (await Promise.all(["aapl", "amzn", "goog", "ibm"].map(loadSymbol))).flat();
  return (
    <Replot
      style="overflow: visible;"
      y={{
        type: "log",
        grid: true,
        label: "Change in price (%)",
        tickFormat: formatChange
      }}
    >
      <RuleY data={[1]} />
      <Line
        data={stocks}
        {...normalizeY({
          x: "Date",
          y: "Close",
          stroke: "Symbol"
        })}
      />
      <Text
        data={stocks}
        {...selectLast(
          normalizeY({
            x: "Date",
            y: "Close",
            z: "Symbol",
            text: (d) => d.Symbol.toUpperCase(),
            textAnchor: "start",
            dx: 3
          })
        )}
      />
    </Replot>
  );
}
