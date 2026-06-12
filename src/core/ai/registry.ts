/**
 * THE single registration point for AI action families (M12 architecture
 * requirement): adding a future action kind means adding one family module
 * and one entry here — never editing the chooser or the engine. Registry
 * order is also the documented tie-break order (see ai/choose.ts).
 */
import type { ActionFamily } from "./context";
import { strikeFamily } from "./families/strike";
import { castFamily } from "./families/cast";
import { moveFamily } from "./families/move";
import { standFamily } from "./families/stand";
import { endTurnFamily } from "./families/end-turn";

export const ACTION_FAMILIES: readonly ActionFamily[] = [
  strikeFamily,
  castFamily,
  moveFamily,
  standFamily,
  endTurnFamily,
];
