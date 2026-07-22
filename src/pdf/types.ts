/**
 * One positioned text run from a PDF page. Coordinates are PDF points with a
 * TOP-LEFT origin (the extractor flips pdf.js's bottom-left y), so smaller y
 * = higher on the page. Statement parsing is column-based: x-ranges identify
 * columns, y-clustering identifies lines. Plain text order is unreliable.
 */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 0-based. */
  pageIndex: number;
  fontName: string;
  pageWidth: number;
  pageHeight: number;
}
