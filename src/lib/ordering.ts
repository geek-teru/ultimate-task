/**
 * 2つの position の中間値を求める。
 * 並び替え時に他の行を書き換えず、移動した1行だけを UPDATE するために使う。
 */
export function midpoint(a: number, b: number): number {
  return (a + b) / 2;
}
