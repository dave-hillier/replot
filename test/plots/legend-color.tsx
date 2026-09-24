import * as d3 from "d3";
import {Replot, CellX, legend} from "../../src/react/api.js";
import {plot as imperativePlot, dot as imperativeDot} from "@dave-hillier/replot";

export function colorLegendCategorical() {
  return legend({color: {domain: "ABCDEFGHIJ"}});
}

export function colorLegendCategoricalColumns() {
  return legend({
    color: {
      domain: [
        "Wholesale and Retail Trade",
        "Manufacturing",
        "Leisure and hospitality",
        "Business services",
        "Construction",
        "Education and Health",
        "Government",
        "Finance",
        "Self-employed",
        "Other"
      ]
    },
    label: "Hello",
    columns: "180px"
  });
}

export function colorLegendCategoricalScheme() {
  return legend({color: {domain: "ABCDEFGHIJ", scheme: "category10"}});
}

export function colorLegendCategoricalReverse() {
  return legend({color: {domain: "ABCDEFGHIJ", reverse: true}});
}

export function colorLegendDomainUnary() {
  return legend({color: {domain: [0]}});
}

export function colorLegendDomainEmpty() {
  return legend({color: {domain: []}});
}

export function colorLegendLinearDomainUnary() {
  return legend({color: {type: "linear", domain: [0]}});
}

export function colorLegendLinearDomainEmpty() {
  return legend({color: {type: "linear", domain: []}});
}

export function colorLegendOrdinal() {
  return legend({color: {type: "ordinal", domain: "ABCDEFGHIJ"}});
}

export function colorLegendOrdinalRamp() {
  return legend({color: {type: "ordinal", domain: "ABCDEFGHIJ"}, legend: "ramp"});
}

export function colorLegendOrdinalRampInline() {
  return (
    <Replot legend="ramp" color={{type: "ordinal", domain: "ABCDEFGHIJ"}}>
      <CellX data="ABCDEFGHIJ" />
    </Replot>
  );
}

export function colorLegendOrdinalRampTickSize() {
  return legend({
    color: {
      domain: ["<20", "20-29", "30-39", "40-49", "50-59", "60-69", "\u226570"],
      scheme: "Spectral",
      label: "Age (years)"
    },
    legend: "ramp",
    tickSize: 0
  });
}

export function colorLegendOrdinalReverseRamp() {
  return legend({color: {type: "ordinal", domain: "ABCDEFGHIJ", reverse: true}, legend: "ramp"});
}

export function colorLegendOrdinalScheme() {
  return legend({color: {type: "ordinal", domain: "ABCDEFGHIJ", scheme: "rainbow"}});
}

export function colorLegendOrdinalSchemeRamp() {
  return legend({color: {type: "ordinal", domain: "ABCDEFGHIJ", scheme: "rainbow"}, legend: "ramp"});
}

export function colorLegendOrdinalTicks() {
  return legend({color: {type: "categorical", domain: [0, 1, 2, 3, 4], ticks: [0, 1, 4]}, legend: "ramp"});
}

export function colorLegendOrdinalTickFormat() {
  return legend({color: {type: "ordinal", domain: [1, 2, 3, 4, 5], tickFormat: ".1f"}});
}

export function colorLegendOrdinalTickFormatFunction() {
  return legend({color: {type: "ordinal", domain: [1, 2, 3, 4, 5], tickFormat: (d) => d.toFixed(1)}});
}

export function colorLegendQuantitative() {
  return legend({color: {domain: [0, 10]}});
}

export function colorLegendQuantitativeScheme() {
  return legend({color: {scheme: "blues", domain: [0, 1]}});
}

export function colorLegendLinear() {
  return legend({color: {type: "linear", domain: [0, 10]}});
}

export function colorLegendLinearNoTicks() {
  return legend({color: {type: "linear", tickFormat: null, domain: [0, 10]}});
}

export function colorLegendLinearTruncatedScheme() {
  return legend({color: {scheme: "rainbow", domain: [0, 1], range: [0.5, 1]}});
}

export function colorLegendSqrt() {
  return legend({color: {type: "sqrt", domain: [0, 10]}});
}

export function colorLegendSqrtPiecewise() {
  return legend({color: {type: "sqrt", domain: [-100, 0, 100], range: ["blue", "white", "red"]}});
}

export function colorLegendInterpolate() {
  return legend({color: {domain: [0, 10], range: ["steelblue", "orange"], interpolate: "hcl"}});
}

export function colorLegendInterpolateSqrt() {
  return legend({color: {type: "sqrt", domain: [0, 10]}});
}

export function colorLegendLog() {
  return legend({color: {type: "log", domain: [1, 10]}});
}

export function colorLegendLogTicks() {
  return legend({color: {type: "log", domain: [1, 10], ticks: 10}});
}

export function colorLegendLabelScale() {
  return legend({color: {type: "linear", domain: [0, 10], label: "Scale"}});
}

export function colorLegendLabelLegend() {
  return legend({color: {type: "linear", domain: [0, 10]}, label: "Legend"});
}

export function colorLegendLabelBoth() {
  return legend({color: {type: "linear", domain: [0, 10], label: "Scale"}, label: "Legend"});
}

export function colorLegendMargins() {
  return legend({
    color: {
      type: "sqrt",
      domain: [0, 10],
      label: "I feel blue"
    },
    width: 400,
    marginLeft: 150,
    marginRight: 50
  });
}

export function colorLegendThreshold() {
  return legend({
    color: {
      type: "threshold",
      scheme: "viridis",
      domain: d3.range(1, 10),
      label: "Viridis"
    }
  });
}

export function colorLegendThresholdTickSize() {
  return legend({
    color: {
      type: "threshold",
      domain: [2.5, 3.1, 3.5, 3.9, 6, 7, 8, 9.5],
      scheme: "RdBu",
      label: "Unemployment rate (%)"
    },
    tickSize: 0
  });
}

// Quantile scales are implicitly converted to threshold scales.
export function colorLegendQuantile() {
  return legend({
    color: {
      type: "quantile",
      scheme: "inferno",
      domain: d3.range(100).map((i) => i ** 2),
      n: 7,
      label: "Inferno"
    },
    tickFormat: ",d"
  });
}

export function colorLegendQuantileImplicit() {
  return imperativePlot({
    color: {
      type: "quantile",
      scheme: "inferno",
      n: 7,
      label: "Inferno",
      tickFormat: ",d"
    },
    marks: [imperativeDot(d3.range(100), {fill: (i) => i ** 2})]
  }).legend("color");
}

export function colorLegendQuantileSwatches() {
  return legend({
    legend: "swatches",
    color: {
      type: "quantile",
      scheme: "inferno",
      domain: d3.range(100).map((i) => i ** 2),
      n: 7,
      label: "Inferno"
    },
    tickFormat: ",d"
  });
}

// Quantize scales are implicitly converted to threshold scales.
export function colorLegendQuantize() {
  return legend({
    color: {
      type: "quantize",
      domain: [1, 144],
      n: 7,
      label: "quantize scale"
    }
  });
}

export function colorLegendQuantizeDescending() {
  return legend({
    color: {
      type: "quantize",
      domain: [144, 1],
      label: "quantize descending"
    }
  });
}

export function colorLegendQuantizeDescendingReversed() {
  return legend({
    color: {
      type: "quantize",
      domain: [10, 0.1],
      reverse: true,
      label: "quantize descending reversed"
    }
  });
}

export function colorLegendQuantizeRange() {
  return legend({
    color: {
      type: "quantize",
      domain: [1, 144],
      range: d3.schemeBlues[5],
      label: "quantize scale"
    }
  });
}

export function colorLegendQuantizeReverse() {
  return legend({
    color: {
      type: "quantize",
      domain: [-49.99, 91.61],
      reverse: true,
      label: "quantize reversed"
    }
  });
}

export function colorLegendImplicitLabel() {
  return imperativePlot({
    color: {scheme: "viridis"},
    marks: [
      imperativeDot(
        d3.range(100).map((i) => ({thing: i})),
        {fill: "thing"}
      )
    ]
  }).legend("color");
}

export function colorLegendDiverging() {
  return legend({
    color: {
      domain: [-0.1, 0.1],
      scheme: "PiYG",
      label: "Daily change"
    },
    tickFormat: "+%"
  });
}

export function colorLegendDivergingPivot() {
  return legend({
    color: {
      domain: [1, 4],
      pivot: 3,
      scheme: "PiYG"
    }
  });
}

export function colorLegendDivergingPivotAsymmetric() {
  return legend({
    color: {
      symmetric: false,
      domain: [1, 4],
      pivot: 3,
      scheme: "PiYG"
    }
  });
}

export function colorLegendDivergingSqrt() {
  return legend({
    color: {
      type: "diverging-sqrt",
      domain: [-0.1, 0.1],
      scheme: "PiYG",
      label: "Daily change"
    },
    tickFormat: "+%"
  });
}

export function colorSchemesOrdinal() {
  const div = document.createElement("DIV");
  for (const scheme of [
    "accent",
    "category10",
    "dark2",
    "paired",
    "pastel1",
    "pastel2",
    "set1",
    "set2",
    "set3",
    "tableau10",
    "brbg",
    "prgn",
    "piyg",
    "puor",
    "rdbu",
    "rdgy",
    "rdylbu",
    "rdylgn",
    "spectral",
    "burd",
    "buylrd",
    "blues",
    "greens",
    "greys",
    "oranges",
    "purples",
    "reds",
    "turbo",
    "viridis",
    "magma",
    "inferno",
    "plasma",
    "cividis",
    "cubehelix",
    "warm",
    "cool",
    "bugn",
    "bupu",
    "gnbu",
    "orrd",
    "pubu",
    "pubugn",
    "purd",
    "rdpu",
    "ylgn",
    "ylgnbu",
    "ylorbr",
    "ylorrd",
    "rainbow",
    "sinebow"
  ] as const) {
    div.append(
      legend({color: {type: "ordinal", scheme, domain: [scheme]}}),
      legend({color: {type: "ordinal", scheme, domain: [scheme, ...`1`]}}),
      legend({color: {type: "ordinal", scheme, domain: [scheme, ...`123`]}}),
      legend({color: {type: "ordinal", scheme, domain: [scheme, ...`12345678`]}}),
      legend({color: {type: "ordinal", scheme, domain: [scheme, ...`1234567890ABCD`]}})
    );
  }
  return div;
}

export function colorSchemesQuantitative() {
  const div = document.createElement("DIV");
  for (const scheme of [
    "brbg",
    "prgn",
    "piyg",
    "puor",
    "rdbu",
    "rdgy",
    "rdylbu",
    "rdylgn",
    "spectral",
    "burd",
    "buylrd",
    "blues",
    "greens",
    "greys",
    "purples",
    "reds",
    "oranges",
    "turbo",
    "viridis",
    "magma",
    "inferno",
    "plasma",
    "cividis",
    "cubehelix",
    "warm",
    "cool",
    "bugn",
    "bupu",
    "gnbu",
    "orrd",
    "pubugn",
    "pubu",
    "purd",
    "rdpu",
    "ylgnbu",
    "ylgn",
    "ylorbr",
    "ylorrd",
    "rainbow",
    "sinebow"
  ] as const) {
    div.append(legend({color: {type: "linear", scheme}, label: scheme, ticks: 0, tickSize: 0, marginBottom: 10}));
  }
  return div;
}

export async function colorLegendOpacity() {
  return legend({color: {domain: ["Dream", "Torgersen", "Biscoe"]}, opacity: 0.5});
}

export async function colorLegendOpacityRamp() {
  return legend({color: {domain: [0, 1000]}, opacity: 0.5});
}

export function colorLegendOpacityOrdinalRamp() {
  return legend({color: {type: "ordinal", domain: "ABCDEFGHIJ"}, legend: "ramp", opacity: 0.5});
}
