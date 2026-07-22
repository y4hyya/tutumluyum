# Tutumluyum

**Turkish personal finance, 100% on your phone.** Upload your monthly credit
card statement PDF; Tutumluyum parses it entirely on-device, breaks your
spending into categories, and — the killer feature — finds the forgotten
subscriptions you are still paying for:

> **SPOTIFY — 7 aydır ödüyorsun · ₺149,99/ay · toplam ₺1.049,93.**
> Hâlâ kullanıyor musun?

## The privacy model

This is the entire point of the app, so it is enforced, not promised:

- **Zero network calls.** No backend, no accounts, no cloud sync, no
  analytics, no crash reporting. The app is fully functional in airplane mode.
- ESLint errors on `fetch` / `XMLHttpRequest` / `WebSocket` / `axios` in
  `src/`, and `src/__tests__/no-network.test.ts` re-scans the source tree on
  every test run (it even bans `http://` strings).
- Your PDF is read from disk, decoded by a **bundled** pdf.js inside a local
  WebView page, and stored in **SQLite on the device**. Nothing ever leaves.
- Parsing is **deterministic code** — no LLM, no ML, no cloud OCR.

## The golden rule of parsing

**The parser never guesses and never silently drops data.** Every line inside
a statement's transaction region becomes either a transaction or an
`unparsed_lines` row with a human-readable reason, and the sum of parsed
transactions is reconciled to the kuruş against the total printed on the PDF
(`previousBalance + Σ(transactions) = totalAmount`). If it doesn't reconcile,
the statement is marked *kontrol gerekli* and the app shows exactly which
lines it did not understand. A wrong number shown confidently is far worse
than an admitted gap.

All six real-world fixture months parse with **zero unparsed lines and a
0-kuruş reconciliation delta** (`src/parsers/__tests__/isbank.test.ts`).

## Architecture

```
                ┌────────────────────────────────────────────────┐
                │                    DEVICE                      │
                │                                                │
 statement.pdf ─┼─▶ expo-document-picker                         │
                │        │ file:// uri                           │
                │        ▼                                       │
                │   extractText()  ──── chunked base64 ────┐     │
                │        ▲                                 ▼     │
                │        │                    hidden 0×0 WebView │
                │   TextItem[] ◀── postMessage ── pdf.js (local, │
                │   {str,x,y,w,h,page}          bundled asset)   │
                │        │                                       │
                │        ▼                                       │
                │   registry.requireAdapter() ── no match? ──▶ ✗ │
                │        │                    UnsupportedBankErr │
                │        ▼                                       │
                │   IsBankasiAdapter.parse()   column-based,     │
                │        │                     coordinate-driven │
                │        ▼                                       │
                │   reconcile() ─ mismatch? ─▶ needs_review      │
                │        │                                       │
                │        ▼                                       │
                │   normalize() ▶ categorize() ▶ SQLite          │
                │        │                        │              │
                │        ▼                        ▼              │
                │   detectRecurring()      dashboard / lists     │
                │   (pure functions)       (expo-router screens) │
                └────────────────────────────────────────────────┘
                          NOTHING CROSSES THIS BOX
```

- `src/pdf/` — WebView extraction host, typed errors (`PasswordRequiredError`,
  `WrongPasswordError`), chunked message protocol.
- `src/parsers/` — bank adapters + registry + strict Turkish number/date
  parsing + reconciliation. See [the golden rule](src/parsers/README.md).
- `src/analysis/` — merchant normalization, categorization, recurrence
  detection. Pure functions, ≥90% enforced coverage.
- `src/db/` — SQLite schema, append-only migrations, repositories.
- `src/theme/` + `src/components/ui/` — neo-brutalist design system: 7 flat
  colors, hard offset shadows, zero border radius (enforced by
  `src/__tests__/brutalism.test.ts`).
- `fixtures/` — anonymized real statements; see
  [fixtures/README.md](fixtures/README.md) for the privacy boundary.

## Run it

```sh
npm install          # also wires the privacy pre-commit hook
npx expo start
```

Scan the QR with **Expo Go** on a physical device (Android or iOS). For a
standalone dev build on a connected Android phone:

```sh
npx expo run:android
```

Try it in airplane mode — everything works.

## Test it

```sh
npm test              # 147 tests: golden files, recurrence, guards
npm run test:coverage # enforces >=90% on src/analysis + src/parsers
npm run typecheck
npm run lint
```

## Add a bank

Short version — the long one is [docs/ADD_A_BANK.md](docs/ADD_A_BANK.md):

1. Put a real statement PDF in `fixtures/private/` (gitignored, hook-blocked).
2. `npm run anonymize -- fixtures/private/x.pdf --name yourbank-01`, then
   **review the `.readable.txt` output line by line**.
3. Read the real layout from the dump. Never invent it.
4. Write `yourbank-01.expected.json`, then implement
   `detect()`/`parse()` in `src/parsers/yourbank.ts` until the golden test
   passes with zero unparsed lines and a 0-kuruş reconciliation delta.
5. Register the adapter in `src/parsers/index.ts`. Done — everything else
   (import UI, categorization, recurrence) is bank-agnostic.

## License

MIT — see [LICENSE](LICENSE). Fonts (Archivo Black, Space Mono) are OFL,
vendored in `assets/fonts/`. pdf.js (Apache-2.0) is vendored in
`assets/pdfjs/` from `pdfjs-dist@3.11.174`.
