import { TextItem } from '@/pdf/types';

import { columnText, groupIntoLines, joinLineText } from '../lines';

function item(partial: Partial<TextItem> & { str: string; x: number; y: number }): TextItem {
  return {
    width: partial.str.length * 5,
    height: 10,
    pageIndex: 0,
    fontName: 'f1',
    pageWidth: 595,
    pageHeight: 842,
    ...partial,
  };
}

describe('groupIntoLines', () => {
  it('clusters items on the same visual line despite sub-point jitter', () => {
    const lines = groupIntoLines([
      item({ str: 'MIGROS', x: 100, y: 200.4 }),
      item({ str: '15.06.2026', x: 40, y: 200 }),
      item({ str: '1.284,50', x: 300, y: 201.1 }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('15.06.2026 MIGROS 1.284,50');
  });

  it('separates distinct lines and sorts them top to bottom', () => {
    const lines = groupIntoLines([
      item({ str: 'SECOND', x: 40, y: 220 }),
      item({ str: 'FIRST', x: 40, y: 200 }),
    ]);
    expect(lines.map((l) => l.text)).toEqual(['FIRST', 'SECOND']);
  });

  it('never merges across pages', () => {
    const lines = groupIntoLines([
      item({ str: 'P1', x: 40, y: 200 }),
      item({ str: 'P2', x: 40, y: 200, pageIndex: 1 }),
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0].page).toBe(0);
    expect(lines[1].page).toBe(1);
  });

  it('respects a custom y tolerance', () => {
    const items = [item({ str: 'A', x: 0, y: 100 }), item({ str: 'B', x: 20, y: 103 })];
    expect(groupIntoLines(items)).toHaveLength(2);
    expect(groupIntoLines(items, { yTolerance: 4 })).toHaveLength(1);
  });
});

describe('joinLineText', () => {
  it('adds spaces only for real horizontal gaps', () => {
    const glued = [item({ str: 'AB', x: 0, y: 0, width: 10 }), item({ str: 'CD', x: 10.4, y: 0 })];
    expect(joinLineText(glued)).toBe('ABCD');

    const spaced = [item({ str: 'AB', x: 0, y: 0, width: 10 }), item({ str: 'CD', x: 18, y: 0 })];
    expect(joinLineText(spaced)).toBe('AB CD');
  });

  it('collapses whitespace bloat from the PDF', () => {
    const items = [item({ str: '  A  ', x: 0, y: 0, width: 10 }), item({ str: ' B ', x: 30, y: 0 })];
    expect(joinLineText(items)).toBe('A B');
  });
});

describe('columnText', () => {
  it('extracts only the items whose center is inside the x-range', () => {
    const line = groupIntoLines([
      item({ str: '15.06.2026', x: 40, y: 100, width: 50 }), // center 65
      item({ str: 'SPOTIFY', x: 150, y: 100, width: 60 }), // center 180
      item({ str: '149,99', x: 400, y: 100, width: 40 }), // center 420
    ])[0];

    expect(columnText(line, 0, 120)).toBe('15.06.2026');
    expect(columnText(line, 120, 350)).toBe('SPOTIFY');
    expect(columnText(line, 350, 595)).toBe('149,99');
    expect(columnText(line, 500, 595)).toBe('');
  });
});
