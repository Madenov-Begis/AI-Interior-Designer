export class CanvasHistory {
  private snapshots: string[] = [];
  private index = -1;
  get state() {
    return {
      canUndo: this.index > 0,
      canRedo: this.index >= 0 && this.index < this.snapshots.length - 1,
    };
  }
  capture(snapshot: string) {
    if (this.snapshots[this.index] === snapshot) return false;
    this.snapshots = [
      ...this.snapshots.slice(0, this.index + 1),
      snapshot,
    ].slice(-100);
    this.index = this.snapshots.length - 1;
    return true;
  }
  peek(direction: -1 | 1) {
    return this.snapshots[this.index + direction];
  }
  move(direction: -1 | 1) {
    if (this.peek(direction) !== undefined) this.index += direction;
  }
  clear() {
    this.snapshots = [];
    this.index = -1;
  }
}
