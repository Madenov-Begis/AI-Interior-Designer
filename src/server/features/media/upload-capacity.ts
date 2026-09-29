import { Gate, CapacityError } from "../../shared/concurrency/gate";
const state = globalThis as typeof globalThis & { __ruvieUploadGate?: Gate };
export const uploadGate = (state.__ruvieUploadGate ??= new Gate(2, 20));
export { CapacityError };
