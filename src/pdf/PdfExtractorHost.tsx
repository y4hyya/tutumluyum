import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ExtractionTimeoutError, PdfParseError } from './errors';
import { ExtractionJob, finishActiveJob, getActiveJob, registerExtractorRunner } from './extractText';
import { buildInjectionScripts, errorFromCode, parseExtractorMessage } from './protocol';

const JOB_TIMEOUT_MS = 90_000;

/**
 * Hidden, zero-size WebView that hosts the self-contained pdf.js extractor
 * page. Mounted exactly once in the root layout. Everything stays on-device:
 * the page is a bundled asset and the PDF bytes travel over injectJavaScript.
 */
export function PdfExtractorHost() {
  const webviewRef = useRef<WebView>(null);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  const [webviewKey, setWebviewKey] = useState(0);
  const readyRef = useRef(false);
  const pendingJobRef = useRef<ExtractionJob | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const asset = Asset.fromModule(require('../../assets/pdfjs/extractor.html'));
      await asset.downloadAsync();
      if (!cancelled && asset.localUri) setHtmlUri(asset.localUri);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearJobTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const settle = useCallback((settleJob: (job: ExtractionJob) => void) => {
    const job = getActiveJob();
    clearJobTimeout();
    if (job) settleJob(job);
    finishActiveJob();
  }, []);

  const startJob = useCallback(async (job: ExtractionJob) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(job.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const webview = webviewRef.current;
      if (!webview) throw new PdfParseError('Extractor WebView is not mounted');
      timeoutRef.current = setTimeout(() => {
        settle((j) => j.reject(new ExtractionTimeoutError()));
        setWebviewKey((k) => k + 1); // recycle a possibly wedged page
        readyRef.current = false;
      }, JOB_TIMEOUT_MS);
      for (const script of buildInjectionScripts(base64, job.password)) {
        webview.injectJavaScript(script);
      }
    } catch (e) {
      settle((j) => j.reject(e instanceof Error ? e : new PdfParseError(String(e))));
    }
  }, [settle]);

  const runJob = useCallback(
    (job: ExtractionJob) => {
      if (!readyRef.current) {
        // Page not loaded yet — hold the job; onMessage('ready') releases it.
        pendingJobRef.current = job;
        return;
      }
      void startJob(job);
    },
    [startJob],
  );

  useEffect(() => {
    registerExtractorRunner(runJob);
    return () => registerExtractorRunner(null);
  }, [runJob]);

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const msg = parseExtractorMessage(event.nativeEvent.data);
      if (!msg) return;

      switch (msg.type) {
        case 'ready': {
          readyRef.current = true;
          const held = pendingJobRef.current;
          pendingJobRef.current = null;
          if (held) void startJob(held);
          break;
        }
        case 'items': {
          getActiveJob()?.items.push(...msg.items);
          break;
        }
        case 'done': {
          settle((j) => j.resolve(j.items));
          break;
        }
        case 'error': {
          settle((j) => j.reject(errorFromCode(msg.code, msg.message)));
          break;
        }
      }
    },
    [settle, startJob],
  );

  const onProcessGone = useCallback(() => {
    readyRef.current = false;
    settle((j) => j.reject(new PdfParseError('Extractor WebView crashed')));
    setWebviewKey((k) => k + 1);
  }, [settle]);

  if (!htmlUri) return null;

  return (
    <View style={styles.hidden} pointerEvents="none">
      <WebView
        key={webviewKey}
        ref={webviewRef}
        source={{ uri: htmlUri }}
        originWhitelist={['*']}
        javaScriptEnabled
        allowFileAccess
        allowingReadAccessToURL={htmlUri}
        onMessage={onMessage}
        onRenderProcessGone={onProcessGone}
        onContentProcessDidTerminate={onProcessGone}
        cacheEnabled={false}
        incognito
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
});
