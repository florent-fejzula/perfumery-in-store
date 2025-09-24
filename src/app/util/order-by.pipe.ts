import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'orderBy', standalone: true })
export class OrderByPipe implements PipeTransform {
  transform<T extends Record<string, unknown>>(
    arr: T[] | null | undefined,
    primary?: keyof T | string,
    secondary?: keyof T | string
  ): T[] {
    if (!arr || !Array.isArray(arr) || (!primary && !secondary)) {
      return arr ?? [];
    }

    // Normalize keys because Angular templates pass strings
    const pKey = primary as keyof T | undefined;
    const sKey = secondary as keyof T | undefined;

    return [...arr].sort((a, b) => {
      const c1 = pKey ? this.compareValues(a[pKey], b[pKey]) : 0;
      if (c1 !== 0) return c1;
      if (sKey) {
        return this.compareValues(a[sKey], b[sKey]);
      }
      return 0;
    });
  }

  private compareValues(a: unknown, b: unknown): number {
    // null/undefined go last
    const aU = a === null || a === undefined;
    const bU = b === null || b === undefined;
    if (aU && bU) return 0;
    if (aU) return 1;
    if (bU) return -1;

    // numbers get numeric compare
    if (typeof a === 'number' && typeof b === 'number') {
      return a < b ? -1 : a > b ? 1 : 0;
    }

    // fall back to string compare (case-insensitive)
    const as = String(a).toLowerCase();
    const bs = String(b).toLowerCase();
    return as.localeCompare(bs);
  }
}
