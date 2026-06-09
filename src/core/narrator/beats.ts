import type { BeatId } from "../../shared/ids";

const BEAT_PROSE: Record<BeatId, string> = {
  beat_drowned_market_echoes:
    "Water still pools between the drowned stalls of the market. Your boots scrape against barnacled stone. " +
    "Somewhere beneath the rubble, a bell tolls once — muffled, as if the city itself remembers when this place was alive.",
};

export function getBeatProse(beatId: BeatId): string | undefined {
  return BEAT_PROSE[beatId];
}
