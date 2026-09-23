import {Replot, Frame, Vector, Text} from "../../src/react/api.js";

export async function vectorFrame() {
  return (
    <Replot inset={12} width={200} height={200}>
      <Frame />
      <Vector data={[null]} length={100} rotate={-135} anchor="start" frameAnchor="top-right" dx={-10} dy={10} />
      <Vector data={[null]} length={100} rotate={45} anchor="start" frameAnchor="bottom-left" dx={10} dy={-10} />
      <Vector data={[null]} length={100} rotate={135} anchor="start" frameAnchor="top-left" dx={10} dy={10} />
      <Vector data={[null]} length={100} rotate={-45} anchor="start" frameAnchor="bottom-right" dx={-10} dy={-10} />
      <Text data={[null]} x={null} y={null} text={() => "Ο"} />
    </Replot>
  );
}
