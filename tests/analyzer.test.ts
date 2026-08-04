import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyze } from '../src/engine/analyzer.ts'
import { rules } from '../src/engine/rules.ts'
import { examples } from '../src/engine/examples.ts'

const SEVERITIES = ['critical', 'high', 'medium', 'low']
const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'network',
  'general',
]

test('empty input produces no diagnosis', () => {
  const result = analyze('   ')
  assert.equal(result.primary, null)
  assert.deepEqual(result.alternatives, [])
  assert.equal(result.detectedLanguage, 'general')
  assert.equal(result.input, '')
})

test('input is trimmed before analysis', () => {
  const result = analyze('  hello world  ')
  assert.equal(result.input, 'hello world')
})

test('unrecognized input produces no diagnosis', () => {
  const result = analyze('just some random prose with no error signatures')
  assert.equal(result.primary, null)
  assert.deepEqual(result.alternatives, [])
})

test('reasoning chain always opens with language detection', () => {
  const result = analyze('TypeError: Cannot read properties of undefined')
  assert.equal(result.reasoning[0].label, 'Language Detection')
})

// Every shipped example must map to its intended diagnosis. This doubles as a
// regression test for language-affinity ranking: "Unhandled Promise Rejection"
// is only classified correctly because JS rules are boosted for JS input.
const expectedPerExample: Record<string, string> = {
  'JS: Cannot read properties of undefined': 'js-null-ref',
  'JS: Module not found': 'js-module-not-found',
  'JS: Maximum call stack': 'js-stack-overflow',
  'Network: CORS blocked': 'net-cors',
  'Python: KeyError': 'py-key-error',
  'Python: ModuleNotFoundError': 'py-import-error',
  'Python: AttributeError NoneType': 'py-attribute-error',
  'JS: Unhandled Promise Rejection': 'js-unhandled-promise',
}

for (const example of examples) {
  test(`example "${example.label}" diagnoses as ${expectedPerExample[example.label]}`, () => {
    const result = analyze(example.text)
    assert.ok(result.primary, `${example.label}: expected a primary diagnosis`)
    assert.equal(result.primary.rule.id, expectedPerExample[example.label])
    assert.ok(result.primary.confidence > 50, `${example.label}: expected a confident match`)
  })
}

test('a JS error detected as javascript is boosted by language affinity', () => {
  const result = analyze(
    "TypeError: Cannot read properties of undefined (reading 'map')\n" +
      '    at UserList (src/components/UserList.tsx:14:22)',
  )
  assert.equal(result.detectedLanguage, 'javascript')
  assert.equal(result.primary?.rule.id, 'js-null-ref')
  assert.ok(
    result.reasoning.some((step) => step.label === 'Language Affinity'),
    'expected a Language Affinity reasoning step',
  )
})

test('more strong matches yield higher confidence', () => {
  const frame = '    at UserList (src/components/UserList.js:14:22)'
  const single = analyze(`TypeError: Cannot read properties of undefined\n${frame}`)
  const double = analyze(
    `TypeError: Cannot read properties of undefined\nTypeError: data is undefined\n${frame}`,
  )
  assert.ok(double.primary, 'expected a primary diagnosis')
  assert.ok(single.primary, 'expected a primary diagnosis')
  assert.equal(single.primary.rule.id, 'js-null-ref')
  assert.equal(double.primary.rule.id, 'js-null-ref')
  assert.ok(double.primary.confidence > single.primary.confidence)
})

test('language affinity never invents a diagnosis from keywords alone', () => {
  // 'hello' is a JS file marker? No — this prose has no rule signal at all,
  // so even a 'general' language match must not fabricate a diagnosis.
  const result = analyze('nothing here matches any rule')
  assert.equal(result.primary, null)
})

test('all rules are well-formed', () => {
  const ids = new Set<string>()
  for (const rule of rules) {
    assert.ok(!ids.has(rule.id), `duplicate rule id: ${rule.id}`)
    ids.add(rule.id)
    assert.ok(rule.id.length > 0)
    assert.ok(rule.category.length > 0, `${rule.id}: empty category`)
    assert.ok(SEVERITIES.includes(rule.severity), `${rule.id}: bad severity`)
    assert.ok(LANGUAGES.includes(rule.language), `${rule.id}: bad language`)
    assert.ok(rule.patterns.length > 0, `${rule.id}: no patterns`)
    assert.ok(rule.patterns.every((p) => p instanceof RegExp), `${rule.id}: bad pattern`)
    assert.ok(rule.summary.length > 0, `${rule.id}: empty summary`)
    assert.ok(rule.explanation.length > 0, `${rule.id}: empty explanation`)
    assert.ok(rule.rootCauses.length > 0, `${rule.id}: no root causes`)
    assert.ok(rule.fixes.length > 0, `${rule.id}: no fixes`)
    for (const fix of rule.fixes) {
      assert.ok(fix.title.length > 0, `${rule.id}: fix without title`)
      assert.ok(fix.detail.length > 0, `${rule.id}: fix without detail`)
    }
    for (const doc of rule.docs ?? []) {
      assert.ok(doc.url.startsWith('http'), `${rule.id}: unsafe doc url`)
    }
  }
})
