import { PasswordRequiredError, PdfParseError, WrongPasswordError } from '../errors';
import {
  buildInjectionScripts,
  errorFromCode,
  INJECTION_CHUNK_SIZE,
  parseExtractorMessage,
} from '../protocol';
import { TextItem } from '../types';

const ITEM: TextItem = {
  str: 'MİGROS',
  x: 42.5,
  y: 120.25,
  width: 50,
  height: 9.5,
  pageIndex: 0,
  fontName: 'g_d0_f1',
  pageWidth: 595.28,
  pageHeight: 841.89,
};

describe('parseExtractorMessage', () => {
  it('parses ready / done / error messages', () => {
    expect(parseExtractorMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(parseExtractorMessage('{"type":"done","pageCount":3,"itemCount":812}')).toEqual({
      type: 'done',
      pageCount: 3,
      itemCount: 812,
    });
    expect(parseExtractorMessage('{"type":"error","code":"password-required"}')).toEqual({
      type: 'error',
      code: 'password-required',
      message: undefined,
    });
  });

  it('parses item batches and keeps Turkish characters intact', () => {
    const raw = JSON.stringify({ type: 'items', items: [ITEM] });
    const msg = parseExtractorMessage(raw);
    expect(msg).toEqual({ type: 'items', items: [ITEM] });
  });

  it('rejects malformed payloads instead of throwing', () => {
    expect(parseExtractorMessage('not json')).toBeNull();
    expect(parseExtractorMessage('null')).toBeNull();
    expect(parseExtractorMessage('{"type":"wat"}')).toBeNull();
    expect(parseExtractorMessage('{"type":"items","items":[{"str":1}]}')).toBeNull();
    expect(parseExtractorMessage('{"type":"done","pageCount":"3"}')).toBeNull();
    expect(parseExtractorMessage('{"type":"error","code":"nonsense"}')).toBeNull();
  });
});

describe('buildInjectionScripts', () => {
  it('wraps small payloads in reset + one chunk + start', () => {
    const scripts = buildInjectionScripts('QUJD');
    expect(scripts).toHaveLength(3);
    expect(scripts[0]).toContain('reset()');
    expect(scripts[1]).toContain('chunk("QUJD")');
    expect(scripts[2]).toContain('start()');
  });

  it('splits large payloads into chunks that reassemble exactly', () => {
    const base64 = 'A'.repeat(INJECTION_CHUNK_SIZE * 2 + 17);
    const scripts = buildInjectionScripts(base64);
    expect(scripts).toHaveLength(2 + 3);
    const reassembled = scripts
      .slice(1, -1)
      .map((s) => /chunk\("([^"]*)"\)/.exec(s)![1])
      .join('');
    expect(reassembled).toBe(base64);
  });

  it('escapes the password safely', () => {
    const scripts = buildInjectionScripts('QUJD', 'şi"fre\\123');
    expect(scripts[2]).toBe(`window.__pdfExtractor.start(${JSON.stringify('şi"fre\\123')});true;`);
  });

  it('omits the password argument when absent', () => {
    expect(buildInjectionScripts('QUJD').at(-1)).toBe('window.__pdfExtractor.start();true;');
  });
});

describe('errorFromCode', () => {
  it('maps codes to typed errors', () => {
    expect(errorFromCode('password-required')).toBeInstanceOf(PasswordRequiredError);
    expect(errorFromCode('wrong-password')).toBeInstanceOf(WrongPasswordError);
    expect(errorFromCode('invalid-pdf')).toBeInstanceOf(PdfParseError);
    expect(errorFromCode('extract-failed', 'boom').message).toBe('boom');
  });
});
