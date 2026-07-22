import {
  extractText,
  finishActiveJob,
  getActiveJob,
  registerExtractorRunner,
  ExtractionJob,
} from '../extractText';
import { TextItem } from '../types';

const item = (str: string): TextItem => ({
  str,
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  pageIndex: 0,
  fontName: '',
  pageWidth: 100,
  pageHeight: 100,
});

afterEach(() => {
  registerExtractorRunner(null);
  // Drain anything the test left active.
  while (getActiveJob()) {
    getActiveJob()!.reject(new Error('drained'));
    finishActiveJob();
  }
});

describe('extractText job queue', () => {
  it('runs jobs one at a time, in order', async () => {
    const started: string[] = [];
    registerExtractorRunner((job: ExtractionJob) => {
      started.push(job.uri);
    });

    const p1 = extractText('file:///a.pdf');
    const p2 = extractText('file:///b.pdf');
    expect(started).toEqual(['file:///a.pdf']);

    getActiveJob()!.items.push(item('A'));
    getActiveJob()!.resolve(getActiveJob()!.items);
    finishActiveJob();
    await expect(p1).resolves.toEqual([item('A')]);
    expect(started).toEqual(['file:///a.pdf', 'file:///b.pdf']);

    getActiveJob()!.reject(new Error('nope'));
    finishActiveJob();
    await expect(p2).rejects.toThrow('nope');
  });

  it('holds jobs until a runner registers', async () => {
    const promise = extractText('file:///c.pdf', 'secret');
    let received: ExtractionJob | null = null;
    registerExtractorRunner((job) => {
      received = job;
    });
    expect(received!.uri).toBe('file:///c.pdf');
    expect(received!.password).toBe('secret');

    received!.resolve([]);
    finishActiveJob();
    await expect(promise).resolves.toEqual([]);
  });
});
