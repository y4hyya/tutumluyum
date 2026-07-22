/** The PDF is encrypted and no password was supplied. */
export class PasswordRequiredError extends Error {
  constructor() {
    super('PDF requires a password');
    this.name = 'PasswordRequiredError';
  }
}

/** A password was supplied but the PDF rejected it. */
export class WrongPasswordError extends Error {
  constructor() {
    super('PDF password is wrong');
    this.name = 'WrongPasswordError';
  }
}

/** The file is not a readable PDF, or extraction failed inside pdf.js. */
export class PdfParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfParseError';
  }
}

/** The WebView did not answer in time (crashed page, enormous file…). */
export class ExtractionTimeoutError extends Error {
  constructor() {
    super('PDF extraction timed out');
    this.name = 'ExtractionTimeoutError';
  }
}
