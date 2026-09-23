import {Replot, Frame, Text} from "../../src/react/api.js";

export async function thisIsJustToSay() {
  return (
    <Replot height={200}>
      <Frame />
      <Text
        data={[
          `This Is Just To Say\nWilliam Carlos Williams, 1934\n\nI have eaten\nthe plums\nthat were in\nthe icebox\n\nand which\nyou were probably\nsaving\nfor breakfast\n\nForgive me\nthey were delicious\nso sweet\nand so cold`
        ]}
        frameAnchor="middle"
      />
    </Replot>
  );
}
