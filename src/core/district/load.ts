import type { District } from "./types";
import { validateDistrict } from "./validate";

export function loadDistrict(raw: District): District {
  const validation = validateDistrict(raw);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }
  return raw;
}
