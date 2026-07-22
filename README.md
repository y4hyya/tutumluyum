# Tutumluyum

Turkish personal finance app: upload your monthly credit card statement PDF,
get it parsed **fully on-device**, see your spending by category — and find the
forgotten subscriptions you are still paying for.

> **Status: under construction.** Full README (architecture, privacy model,
> bank adapter guide) lands with the final phase.

## Hard rules

- **100% on-device.** Zero network calls, no backend, no accounts, no
  analytics. Works in airplane mode. Enforced by ESLint rules and tests.
- **Deterministic parsing.** No LLM, no ML. Column-based PDF parsing per bank.
- **Never guess, never drop.** Every statement line becomes a transaction or an
  explained unparsed line; totals are reconciled against the PDF.

## Run

```sh
npm install
npx expo start
```

Scan the QR with Expo Go on a physical device.
