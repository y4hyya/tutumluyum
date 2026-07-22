# Bank statement parsers

## THE GOLDEN RULE — most important rule in this codebase

**The parser never guesses and never silently drops data.**

Every text line inside a statement's transaction region must end up either as
a parsed transaction or as an `unparsed_lines` row with a human-readable
reason. After parsing, the sum of parsed transactions is reconciled against
the statement total printed on the PDF; if it does not reconcile, the
statement is marked `needs_review` and the user is shown exactly which lines
were not understood.

**A wrong number shown confidently is far worse than an admitted gap.**

## Architecture

```
TextItem[] (positioned text from src/pdf/extractText)
   │
   ▼
registry.requireAdapter(items)      every adapter's detect() is tried;
   │                                no match -> UnsupportedBankError
   ▼                                (NEVER a generic fallback parse)
adapter.parse(items)                column-based, coordinate-driven
   │
   ▼
ParsedStatement { transactions[], unparsedLines[], totalAmount, ... }
   │
   ▼
reconcile()                         sum(transactions) vs printed total
```

- `types.ts` — `BankAdapter`, `ParsedStatement`, `ParsedTransaction`.
- `registry.ts` — adapter registration + detection. Unknown banks throw
  `UnsupportedBankError` carrying the supported-bank list for the UI message.
- `lines.ts` — groups positioned `TextItem`s into visual lines (y-clustering,
  x-sorted, gap-aware text join). Adapters work on these lines plus raw item
  coordinates for column assignment.
- `turkish.ts` — strict Turkish amount (`1.234,56`, trailing `TL`, trailing
  minus, parentheses negatives) and date (`dd.MM.yyyy`, `d Ay yyyy`) parsing.
  Amounts become integer kuruş; a string that does not match strictly returns
  `null` — callers must route the line to `unparsed_lines`, never coerce.
- `reconcile.ts` — the golden-rule check.

## Adding a bank

Golden-file TDD, always (see docs/ADD_A_BANK.md):

1. Put a real statement in `fixtures/private/`, run `npm run anonymize`.
2. Review + commit the anonymized `fixtures/public/<bank>-01.txt`.
3. Write `<bank>-01.expected.json` by reading the fixture yourself.
4. Implement `detect()`/`parse()` until the golden test passes exactly —
   including the reconciliation and the unparsed-line list.

Never write an adapter from an imagined layout.
