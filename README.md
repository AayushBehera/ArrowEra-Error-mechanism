# ArrowEra Error Mechanism

An intelligent error triage and reasoning workbench. Paste any error message or stack trace and get a transparent, step-by-step diagnosis with confidence scoring, root cause analysis, and actionable fix suggestions.

## Demo

Paste an error, click **Analyze Error**, and see the engine work:

```
TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (src/components/UserList.tsx:14:22)
```

The engine detects the language, matches it against 18 built-in rules, and produces a full reasoning chain with confidence score and suggested fixes.

## Features

- **Deterministic analysis** — no API calls, no network, runs entirely in the browser
- **Transparent reasoning** — every step of the engine's logic is shown with evidence
- **Multi-language support** — JavaScript, TypeScript, Python, Java, and network errors
- **Confidence scoring** — pattern matches and keyword signals normalized to a 0-98% scale
- **Severity classification** — Critical / High / Medium / Low with visual badges
- **Fix suggestions** — concrete code snippets for each diagnosis
- **History** — localStorage-backed history with search and delete
- **Stats dashboard** — total analyzed, severity breakdown, top language, average confidence
- **8 built-in examples** — try instantly with one click
- **Workflow stepper** — visual progress: Capture > Analyze > Diagnose > Resolve

## Built With

- [React 19](https://react.dev) — UI framework
- [TypeScript 6](https://www.typescriptlang.org) — type-safe JavaScript
- [Vite 8](https://vite.dev) — build tool and dev server
- [Tailwind CSS 4](https://tailwindcss.com) — utility-first styling

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Type-check
npm run typecheck

# Lint
npm run lint

# Production build
npm run build
```

## Architecture

```
src/
  engine/
    types.ts        Core type definitions (Rule, Diagnosis, AnalysisResult)
    rules.ts        Knowledge base — 18 declarative error rules
    analyzer.ts     Reasoning engine (detect, score, rank, explain)
    examples.ts     Pre-built error examples
  hooks/
    useHistory.ts   localStorage-backed history with useSyncExternalStore
  components/
    Header.tsx
    WorkflowStepper.tsx
    ErrorInput.tsx
    ReasoningChain.tsx
    AnalysisResult.tsx
    HistoryPanel.tsx
    StatsDashboard.tsx
  App.tsx           Top-level layout and state orchestration
  main.tsx          Entry point
  index.css         Tailwind theme and animations
```

## How the Reasoning Engine Works

1. **Language Detection** — heuristic signals (stack trace patterns, file extensions) are scored to identify the source language.
2. **Rule Scoring** — each rule's `patterns` (strong: 30 pts each) and `keywords` (weak: 5 pts each) are matched against the input.
3. **Language Affinity** — rules whose language matches the detected input get a +15 boost, breaking cross-category ties toward the right language.
4. **Confidence Normalization** — raw scores are mapped to a 0-98% confidence scale.
5. **Reasoning Chain** — a step-by-step explanation is generated showing what the engine observed and concluded.
6. **Ranking** — rules are ranked by total score. The top match becomes the primary diagnosis, the next 3 are alternatives.

## Extending the Rule Base

Add a new rule to `src/engine/rules.ts`:

```ts
{
  id: 'my-new-rule',
  category: 'My Error Category',
  language: 'javascript',
  severity: 'medium',
  patterns: [/MySpecificError:/i],
  keywords: ['specific', 'context'],
  summary: 'One-line summary.',
  explanation: 'Why this happens.',
  rootCauses: ['Cause 1', 'Cause 2'],
  fixes: [{ title: 'Fix', detail: 'How to fix.', code: '// example' }],
}
```

The engine picks it up automatically — no registration needed.

## License

MIT
