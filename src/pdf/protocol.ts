/**
 * Typed mirror of the message protocol spoken by assets/pdfjs/extractor.html.
 * Pure module — unit tested, no react-native imports.
 */
import { ExtractionTimeoutError, PasswordRequiredError, PdfParseError, WrongPasswordError } from './errors';
import { TextItem } from './types';

/** Base64 characters per injectJavaScript call (Android evaluateJavascript
 *  handles this size comfortably; one giant string does not). */
export const INJECTION_CHUNK_SIZE = 256 * 1024;

export type ExtractorErrorCode =
  | 'password-required'
  | 'wrong-password'
  | 'invalid-pdf'
  | 'extract-failed';

export type ExtractorOutMessage =
  | { type: 'ready' }
  | { type: 'items'; items: TextItem[] }
  | { type: 'done'; pageCount: number; itemCount: number }
  | { type: 'error'; code: ExtractorErrorCode; message?: string };

function isTextItem(v: unknown): v is TextItem {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.str === 'string' &&
    typeof o.x === 'number' &&
    typeof o.y === 'number' &&
    typeof o.width === 'number' &&
    typeof o.height === 'number' &&
    typeof o.pageIndex === 'number' &&
    typeof o.fontName === 'string' &&
    typeof o.pageWidth === 'number' &&
    typeof o.pageHeight === 'number'
  );
}

/** Returns null for anything that is not a well-formed extractor message. */
export function parseExtractorMessage(raw: string): ExtractorOutMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const msg = parsed as Record<string, unknown>;

  switch (msg.type) {
    case 'ready':
      return { type: 'ready' };
    case 'items':
      if (!Array.isArray(msg.items) || !msg.items.every(isTextItem)) return null;
      return { type: 'items', items: msg.items };
    case 'done':
      if (typeof msg.pageCount !== 'number' || typeof msg.itemCount !== 'number') return null;
      return { type: 'done', pageCount: msg.pageCount, itemCount: msg.itemCount };
    case 'error': {
      const code = msg.code;
      if (
        code !== 'password-required' &&
        code !== 'wrong-password' &&
        code !== 'invalid-pdf' &&
        code !== 'extract-failed'
      ) {
        return null;
      }
      return {
        type: 'error',
        code,
        message: typeof msg.message === 'string' ? msg.message : undefined,
      };
    }
    default:
      return null;
  }
}

/**
 * The exact injectJavaScript calls that feed one PDF into the page:
 * reset, N base64 chunks, start. Base64 is quote-safe by construction;
 * the password is JSON-escaped.
 */
export function buildInjectionScripts(base64: string, password?: string): string[] {
  const scripts: string[] = ['window.__pdfExtractor.reset();true;'];
  for (let i = 0; i < base64.length; i += INJECTION_CHUNK_SIZE) {
    scripts.push(`window.__pdfExtractor.chunk("${base64.slice(i, i + INJECTION_CHUNK_SIZE)}");true;`);
  }
  scripts.push(
    `window.__pdfExtractor.start(${password === undefined ? '' : JSON.stringify(password)});true;`,
  );
  return scripts;
}

export function errorFromCode(code: ExtractorErrorCode, message?: string): Error {
  switch (code) {
    case 'password-required':
      return new PasswordRequiredError();
    case 'wrong-password':
      return new WrongPasswordError();
    case 'invalid-pdf':
      return new PdfParseError(message || 'Invalid PDF');
    case 'extract-failed':
      return new PdfParseError(message || 'Extraction failed');
  }
}

export { ExtractionTimeoutError };
