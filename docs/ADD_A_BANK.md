# Adding a bank adapter

Adapters are purely additive: one file in `src/parsers/`, one registration
line, golden fixtures. Everything downstream (import UI, categorization,
recurrence) is bank-agnostic.

**Prime directive: never write an adapter from an imagined layout.** Every
İş Bankası "obviously true" assumption died on contact with real PDFs
(180°-rotated pages, `+` meaning credit, loyalty points shaped exactly like
money). Yours will too.

## 1. Get real data in

```sh
cp ~/wherever/statement.pdf fixtures/private/
# optional: fixtures/private/password.txt        (PDF password)
# optional: fixtures/private/overrides.json      { "scrub": ["NAME AS PRINTED"] }
```

`fixtures/private/` is gitignored and the pre-commit hook blocks it and any
`*.pdf` repo-wide. You physically cannot commit the real file.

## 2. Anonymize and REVIEW

```sh
npm run anonymize -- fixtures/private/statement.pdf --name yourbank-01
```

Outputs in `fixtures/public/`:

- `yourbank-01.txt` — JSONL of positioned `TextItem`s (the parser's input)
- `yourbank-01.readable.txt` — line-grouped text for humans

The anonymizer scrubs PANs, TCKN, IBANs, phones, reference numbers, `SN.`
name lines, address lines and barcodes, and keeps merchants, dates and
amounts intact. **Read the `.readable.txt` top to bottom anyway.** The
cardholder name is only caught via `overrides.json` and heuristics; the
fixture-privacy test (`src/__tests__/fixture-privacy.test.ts`) is a backstop,
not a guarantee. Ideally anonymize 2–3 different months — template
generations differ (İş Bankası ships two).

## 3. Read the layout

Open the `.readable.txt` and answer, from evidence:

- What text uniquely identifies this bank? (→ `detect()`)
- Where is the transaction table header, and what are the column labels?
- Are amount columns **right-aligned to their header label**? (İş Bankası:
  yes — that right edge is the only safe way to tell money from points.)
- Date format? Decimal format? How are negatives printed (`-1.234,56`,
  `- 1.234,56`, parentheses, trailing minus)? Any `+` and what does it mean?
- Installment notation? FX rows? Interest/fee rows? Carry-over row?
- What is the printed total, and what is the reconciliation identity?
  You are not done until `previous + Σ(rows) = total` holds to the kuruş.
- Where does the table region end on each page (limits block, legal text,
  footers)?

Dump exact coordinates when needed:

```sh
node -e "require('fs').readFileSync('fixtures/public/yourbank-01.txt','utf8')
  .trim().split('\n').map(JSON.parse)
  .filter(i => i.pageIndex===0 && i.y>350 && i.y<400)
  .forEach(i => console.log(i.y, i.x, i.x+i.width, JSON.stringify(i.str)))"
```

## 4. Write the expected output FIRST

Create `fixtures/public/yourbank-01.expected.json` by reading the dump
yourself (for İş Bankası, `scripts/gen-expected-isbank.ts` generates it from
the readable text — a deliberately independent implementation that
cross-validates the coordinate parser; consider the same trick).

## 5. Golden-file TDD

Copy the shape of `src/parsers/__tests__/isbank.test.ts`:

- deep-equal against `yourbank-01.expected.json`
- `reconcileStatement(parsed)` → `{ ok: true, deltaKurus: 0 }`
- `parsed.unparsedLines` → `[]` for every known-good fixture
- `detect()` accepts your fixtures, rejects the other banks' fixtures

Then implement `src/parsers/yourbank.ts`:

```ts
export const yourbankAdapter: BankAdapter = {
  code: 'YOURBANK',
  displayName: 'Banka Adı',
  detect(items) { /* cheap text check */ },
  parse(items) { /* columns from coordinates; obey the golden rule */ },
};
```

Rules that are not optional:

- Amounts via `parseTurkishAmount` (strict; returns `null` → route the line
  to `unparsedLines`, never coerce).
- Money is integer kuruş. No floats, ever.
- Every non-understood line inside the region → `unparsedLines` with a
  human-readable Turkish reason.
- No generic fallback. If `detect()` is unsure, say no.

## 6. Register

```ts
// src/parsers/index.ts
registerAdapter(yourbankAdapter);
```

Add a line to `docs/DECISIONS.md` with any format facts you proved (sign
conventions, region quirks) and the evidence.
