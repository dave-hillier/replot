import {Replot, Rect, Dot, Text} from "../../src/react/api.js";
import * as d3 from "d3";

export async function multiplicationTable() {
  const numbers = d3.range(2, 10);
  return (
    <Replot
      height={450}
      width={450}
      padding={0}
      color={{type: "categorical"}}
      fx={{axis: "top", tickSize: 6}}
      fy={{tickSize: 6}}
    >
      {/* This rect is faceted by y and repeated across x, and hence all rects in
          a row have the same fill. With rect, the default definitions of x1, x2,
          y1, and y2 will fill the entire frame, similar to Plot.frame. */}
      <Rect data={numbers} fy={numbers} fill={numbers} inset={1} />
      {/* This dot is faceted by x and repeated across y, and hence all dots in a
          column have the same fill. With dot, the default definitions of x and y
          would assume that the data is a tuple [x, y], so we set the frameAnchor
          to middle to draw one dot in the center of each frame. */}
      <Dot data={numbers} frameAnchor="middle" r={19} fx={numbers} fill={numbers} stroke="white" />
      {/* This text is faceted by x and y, and hence we need the cross product of
          the numbers. Again there is just one text mark per facet. */}
      <Text
        data={d3.cross(numbers, numbers)}
        frameAnchor="middle"
        text={([x, y]) => x * y}
        fill="white"
        fx={([x]) => x}
        fy={([, y]) => y}
      />
    </Replot>
  );
}
