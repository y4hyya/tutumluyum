# Fixtures

Two zones with a hard privacy boundary between them:

| Directory | Committed? | Contents |
| --- | --- | --- |
| `fixtures/private/` | **NEVER** (gitignored + pre-commit hook) | Real bank statement PDFs used for local development, plus optional `password.txt` (statement PDF password) and `overrides.json` (extra strings to scrub, e.g. the cardholder name as printed). |
| `fixtures/public/` | Yes | Anonymized extracted text (`*.txt`, JSONL of positioned text items) and expected parser output (`*.expected.json`). |

## Producing a public fixture from a real PDF

```sh
npm run anonymize -- fixtures/private/statement.pdf --bank isbank --name isbank-01
```

The anonymizer extracts positioned text with pdf.js, then replaces card/account
numbers (PAN), TCKN, IBAN, phone numbers and configured name/address strings
with stable fake tokens. Merchant names, dates and amounts are kept intact so
parser golden tests stay meaningful. Review the generated
`fixtures/public/<name>.readable.txt` before committing — the guard test in
`src/__tests__/fixture-privacy.test.ts` additionally scans public fixtures for
digit patterns that look like PANs or TCKNs.

Enable the hooks once after cloning (also runs automatically via `npm install`):

```sh
git config core.hooksPath .githooks
```
