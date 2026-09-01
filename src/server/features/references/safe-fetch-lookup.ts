import type { LookupFunction } from "node:net";
import { isIP } from "node:net";

export type PinnedLookupTarget = {
  address: string;
  family?: number;
};

export function createPinnedLookup(target: PinnedLookupTarget): LookupFunction {
  const family = target.family ?? isIP(target.address);

  return (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address: target.address, family }]);
      return;
    }
    callback(null, target.address, family);
  };
}
