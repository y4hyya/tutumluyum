/**
 * Public API of the on-device PDF text extractor.
 *
 * extractText() enqueues a job; the hidden WebView host (PdfExtractorHost,
 * mounted once in the root layout) executes jobs one at a time and settles
 * the promises. Throws PasswordRequiredError / WrongPasswordError /
 * PdfParseError / ExtractionTimeoutError.
 */
import { TextItem } from './types';

export interface ExtractionJob {
  uri: string;
  password?: string;
  items: TextItem[];
  resolve: (items: TextItem[]) => void;
  reject: (error: Error) => void;
}

type JobRunner = (job: ExtractionJob) => void;

let runner: JobRunner | null = null;
const queue: ExtractionJob[] = [];
let active: ExtractionJob | null = null;

function pump(): void {
  if (active || queue.length === 0 || !runner) return;
  active = queue.shift()!;
  runner(active);
}

/** Called by PdfExtractorHost on mount/unmount. */
export function registerExtractorRunner(r: JobRunner | null): void {
  runner = r;
  pump();
}

/** Called by PdfExtractorHost after it settles the active job's promise. */
export function finishActiveJob(): void {
  active = null;
  pump();
}

export function getActiveJob(): ExtractionJob | null {
  return active;
}

/**
 * Extracts positioned text items from a local PDF file. 100% on-device: the
 * file is read from disk, decoded inside a local WebView page, and never
 * leaves the phone.
 */
export function extractText(uri: string, password?: string): Promise<TextItem[]> {
  return new Promise<TextItem[]>((resolve, reject) => {
    queue.push({ uri, password, items: [], resolve, reject });
    pump();
  });
}
