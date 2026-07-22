/**
 * Groups positioned TextItems into visual lines. PDF text order is
 * unreliable; only coordinates are trusted. Pure module, fully unit tested.
 */
import { TextItem } from '@/pdf/types';

export interface Line {
  page: number;
  /** y of the first (topmost anchor) item in the cluster. */
  y: number;
  /** Sorted left-to-right. */
  items: TextItem[];
  /** Gap-aware joined text, for regex matching and human review. */
  text: string;
}

export interface GroupOptions {
  /** Items within this many points vertically belong to the same line. */
  yTolerance?: number;
  /** Horizontal gap (pt) that becomes a single space in the joined text. */
  gapThreshold?: number;
}

/** Joins one line's x-sorted items, inserting spaces only for real gaps. */
export function joinLineText(items: TextItem[], gapThreshold = 1): string {
  let text = '';
  let prevEnd: number | null = null;
  for (const item of items) {
    if (prevEnd !== null && item.x - prevEnd > gapThreshold && !text.endsWith(' ')) {
      text += ' ';
    }
    text += item.str;
    prevEnd = item.x + item.width;
  }
  return text.replace(/\s+/g, ' ').trim();
}

export function groupIntoLines(items: TextItem[], options: GroupOptions = {}): Line[] {
  const { yTolerance = 2, gapThreshold = 1 } = options;

  const byPage = new Map<number, TextItem[]>();
  for (const item of items) {
    const list = byPage.get(item.pageIndex);
    if (list) list.push(item);
    else byPage.set(item.pageIndex, [item]);
  }

  const lines: Line[] = [];
  for (const page of [...byPage.keys()].sort((a, b) => a - b)) {
    const pageItems = byPage.get(page)!.slice().sort((a, b) => a.y - b.y || a.x - b.x);

    let cluster: TextItem[] = [];
    let anchorY = Number.NEGATIVE_INFINITY;

    const flush = () => {
      if (cluster.length === 0) return;
      const sorted = cluster.slice().sort((a, b) => a.x - b.x);
      lines.push({
        page,
        y: anchorY,
        items: sorted,
        text: joinLineText(sorted, gapThreshold),
      });
      cluster = [];
    };

    for (const item of pageItems) {
      if (cluster.length === 0 || item.y - anchorY <= yTolerance) {
        if (cluster.length === 0) anchorY = item.y;
        cluster.push(item);
      } else {
        flush();
        anchorY = item.y;
        cluster.push(item);
      }
    }
    flush();
  }

  return lines;
}

/** Joined text of the line's items whose horizontal CENTER falls in [x0, x1). */
export function columnText(line: Line, x0: number, x1: number, gapThreshold = 1): string {
  const inRange = line.items.filter((i) => {
    const center = i.x + i.width / 2;
    return center >= x0 && center < x1;
  });
  return joinLineText(inRange, gapThreshold);
}
