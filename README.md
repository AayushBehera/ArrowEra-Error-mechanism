# ArrowEra Error Mechanism

> An intelligent error triage & reasoning workbench — paste an error, get a transparent, step-by-step diagnosis powered by a deterministic rule-based engine.

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06b6d4)](https://tailwindcss.com)

---

## What It Does

1. **Capture** — paste any error message or stack trace (JS/TS, Python, network, etc.)
2. **Analyze** — the engine detects language, scores rules, and builds a reasoning chain
3. **Diagnose** — see the primary diagnosis with confidence, severity, explanation, root causes
4. **Resolve** — get concrete fix suggestions with code snippets

Every step of the engine's logic is surfaced in a transparent **reasoning chain** so you understand *why* it reached its conclusion — no black box.

---

## Features

| Feature | Description |
|---------|-------------|
| Rule-based reasoning engine | 18 rules across JS/TS, Python, network & memory errors |
| Transparent reasoning chain | Every deduction step shown with evidence |
| Confidence scoring | Pattern matches (strong) + keyword signals (weak) → normalized % |
| Multi-language detection | Automatic language identification from stack trace patterns |
| Severity classification | Critical / High / Medium / Low with visual badges |
| Suggested fixes with code | Actionable code snippets for each diagnosis |
| History & persistence | localStorage-backed history with search/delete |
| Stats dashboard | Live metrics: total analyzed, severity breakdown, top language |
| Example library | 8 pre-built error examples to try instantly |
| Workflow stepper | Visual progress indicator: Capture → Analyze → Diagnose → Resolve |

---

## Architecture

```
src/
├── engine/
│   ├── types.ts        # Core type definitions (Rule, Diagnosis, AnalysisResult)
│   ├── rules.ts        # Knowledge base — 18 declarative error rules
│   ├── analyzer.ts     # Reasoning engine (detect → score → rank → explain)
│   └── examples.ts     # Pre-built error examples
├── hooks/
│   └── useHistory.ts   # localStorage-backed history with useSyncExternalStore
├── components/
│   ├── Header.tsx
│   ├── WorkflowStepper.tsx
│   ├── ErrorInput.tsx
│   ├── ReasoningChain.tsx
│   ├── AnalysisResult.tsx
│   ├── HistoryPanel.tsx
│   └── StatsDashboard.tsx
├── App.tsx             # Top-level layout & state orchestration
├── main.tsx            # Entry point
└── index.css           # Tailwind + theme + animations
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type-check
npm run typecheck

# Lint
npm run lint

# Tests (Node's built-in runner — no extra dependencies)
npm test

# Production build
npm run build
```

---

## How the Reasoning Engine Works

1. **Language Detection** — heuristic signals (stack trace patterns, file extensions) are scored to identify the source language.
2. **Rule Scoring** — each rule's `patterns` (strong: 30 pts each) and `keywords` (weak: 5 pts each) are matched against the input.
3. **Language Affinity** — rules whose language matches the detected input language get a +15 boost, breaking cross-category ties toward the right language.
4. **Confidence Normalization** — raw scores (pattern + keyword + affinity) are mapped to a 0–98% confidence scale.
5. **Reasoning Chain** — a step-by-step explanation is generated showing what the engine observed and concluded.
6. **Ranking** — rules are ranked by total score; the top match becomes the primary diagnosis, the next 3 are alternatives.

---

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

---

## License

MIT
