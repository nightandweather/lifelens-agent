/** Local frame comparison and notification policy; no images leave this module. */
export function frameDifference(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  if (a.length !== b.length || !a.length) return 1;
  let sum = 0; for (let i = 0; i < a.length; i += 4) sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  return sum / (a.length / 4 * 3 * 255);
}
export class AmbientGate {
  private seen = new Map<string, number>();
  shouldNotify(key: string, confidence: number, now: number): boolean {
    if (confidence < .65 || now - (this.seen.get(key) ?? -Infinity) < 180_000) return false;
    this.seen.set(key, now);
    if (this.seen.size > 50) this.seen.delete(this.seen.keys().next().value!);
    return true;
  }
  reset() { this.seen.clear(); }
}
export function activityMinutes(kcal: number, weight: number, met: number) {
  if (![kcal, weight, met].every(Number.isFinite) || kcal < 0 || weight < 20 || weight > 300 || met <= 1) return null;
  return Math.round(kcal / (met * 3.5 * weight / 200));
}
