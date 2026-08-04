import type { Rule } from './types.ts'

/**
 * The knowledge base — each rule encodes a known class of programming error.
 * Pattern regexes are intentionally broad so real-world stack traces are caught.
 */
export const rules: Rule[] = [
  // ─── JavaScript / TypeScript ────────────────────────────────────────
  {
    id: 'js-null-ref',
    category: 'Null/Undefined Reference',
    language: 'javascript',
    severity: 'high',
    patterns: [
      /Cannot read propert(y|ies) of (undefined|null)/i,
      /TypeError:.*is (undefined|null)/i,
    ],
    keywords: ['undefined', 'null', 'TypeError', '.ts', '.js'],
    summary: 'Attempted to access a property on a null or undefined value.',
    explanation:
      'This occurs when code assumes a variable holds an object but at runtime it is null or undefined. Common causes include uninitialized state, missing API responses, or incorrect optional chaining.',
    rootCauses: [
      'Variable was never assigned or returned undefined from a function',
      'Asynchronous data not yet loaded when accessed',
      'Destructuring from an object that is null',
      'API response returned null instead of expected shape',
    ],
    fixes: [
      {
        title: 'Add optional chaining',
        detail: 'Use ?. to safely access nested properties.',
        code: 'const name = user?.profile?.name ?? "Unknown";',
      },
      {
        title: 'Guard with null-check',
        detail: 'Validate before accessing.',
        code: 'if (data != null) {\n  process(data.value);\n}',
      },
      {
        title: 'Provide fallback defaults',
        detail: 'Use nullish coalescing or default parameters.',
        code: 'function greet(user = { name: "Guest" }) { ... }',
      },
    ],
    docs: [
      {
        label: 'MDN: Optional chaining',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining',
      },
    ],
  },
  {
    id: 'js-reference-error',
    category: 'Undefined Variable',
    language: 'javascript',
    severity: 'high',
    patterns: [
      /ReferenceError:.*is not defined/i,
      /ReferenceError:.*not defined/i,
    ],
    keywords: ['ReferenceError', 'not defined'],
    summary: 'A variable or function name was used before it was declared.',
    explanation:
      'JavaScript throws ReferenceError when code references an identifier that does not exist in the current scope. This is often a typo, a missing import, or a scoping issue with let/const.',
    rootCauses: [
      'Typo in variable or function name',
      'Missing import or require statement',
      'Variable declared in a different block scope',
      'Using a browser-only global in Node.js (e.g. window, document)',
    ],
    fixes: [
      {
        title: 'Check spelling & imports',
        detail: 'Ensure the name matches the export exactly.',
        code: 'import { myHelper } from "./helpers";',
      },
      {
        title: 'Declare before use',
        detail: 'Move declaration above the reference in temporal dead-zone cases.',
        code: 'const x = 5;\nconsole.log(x); // fine',
      },
    ],
  },
  {
    id: 'js-syntax-error',
    category: 'Syntax Error',
    language: 'javascript',
    severity: 'critical',
    patterns: [
      /SyntaxError: Unexpected token/i,
      /SyntaxError: Unexpected end of input/i,
      /SyntaxError:.*expected/i,
    ],
    keywords: ['SyntaxError', 'Unexpected token', 'parsing'],
    summary: 'The parser encountered invalid syntax it could not interpret.',
    explanation:
      'Syntax errors stop code from executing entirely. They are caught at parse time and indicate structurally invalid code — missing brackets, stray commas, or unsupported syntax for the target runtime.',
    rootCauses: [
      'Missing or extra brackets, parentheses, or braces',
      'Trailing comma in a context that does not allow it',
      'Using ES2020+ syntax without appropriate transpiler setup',
      'Corrupted or truncated file (copy-paste error)',
    ],
    fixes: [
      {
        title: 'Check matched brackets',
        detail: 'Use an editor rainbow-bracket extension to find mismatches.',
      },
      {
        title: 'Ensure correct transpiler config',
        detail: 'If using optional chaining or nullish coalescing, verify your tsconfig/babel target supports it.',
        code: '// tsconfig.json\n{ "compilerOptions": { "target": "ES2020" } }',
      },
    ],
  },
  {
    id: 'js-stack-overflow',
    category: 'Infinite Recursion',
    language: 'javascript',
    severity: 'critical',
    patterns: [
      /Maximum call stack size exceeded/i,
      /RangeError:.*stack/i,
      /too much recursion/i,
    ],
    keywords: ['RangeError', 'recursion', 'stack overflow'],
    summary: 'Infinite or excessively deep recursion exhausted the call stack.',
    explanation:
      'Every function call adds a frame to the call stack. When recursion lacks a proper base case, or components re-render in a loop, the stack fills and the runtime throws.',
    rootCauses: [
      'Recursive function missing a base case',
      'React useEffect with unstable dependency causing re-render loop',
      'Circular JSON.stringify on an object with cycles',
      'Getter/setter that calls itself',
    ],
    fixes: [
      {
        title: 'Add a base case',
        detail: 'Every recursive function must have a condition that stops recursion.',
        code: 'function factorial(n: number): number {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}',
      },
      {
        title: 'Convert to iteration',
        detail: 'Rewrite deep recursion as a loop to avoid stack limits.',
      },
    ],
  },
  {
    id: 'js-not-a-function',
    category: 'Not a Function',
    language: 'javascript',
    severity: 'high',
    patterns: [
      /TypeError:.*is not a function/i,
    ],
    keywords: ['TypeError', 'not a function', 'undefined'],
    summary: 'A non-callable value was invoked as a function.',
    explanation:
      'This fires when code attempts to call () on something that isn\'t a function — often because an import resolved to undefined, or a method name was misspelled.',
    rootCauses: [
      'Misspelled method name on an object',
      'Import resolved to undefined (wrong export name)',
      'Overwriting a function variable with a non-function value',
      'Calling a class as a function without new',
    ],
    fixes: [
      {
        title: 'Verify the import',
        detail: 'Check the module exports the name you are importing.',
        code: '// Wrong: import { myFn } from "./utils"\n// Right: import { myFunction } from "./utils"',
      },
      {
        title: 'Check typeof before calling',
        detail: 'Guard with a type check if the value may be optional.',
        code: 'if (typeof callback === "function") {\n  callback();\n}',
      },
    ],
  },
  {
    id: 'js-module-not-found',
    category: 'Module Not Found',
    language: 'javascript',
    severity: 'high',
    patterns: [
      /Cannot find module/i,
      /MODULE_NOT_FOUND/i,
      /Module not found.*Can't resolve/i,
    ],
    keywords: ['require', 'import', 'module', 'resolve'],
    summary: 'The module resolver could not locate the requested package or file.',
    explanation:
      'Node or bundler cannot find the specified module. Either the dependency is not installed, the path is wrong, or the package.json "exports" field does not expose the subpath.',
    rootCauses: [
      'Package not installed (missing from node_modules)',
      'Typo in module path',
      'Incorrect relative path (./foo vs ../foo)',
      'Package "exports" field blocks the subpath import',
    ],
    fixes: [
      {
        title: 'Install the dependency',
        detail: 'Run npm install or yarn add for the missing package.',
        code: 'npm install <package-name>',
      },
      {
        title: 'Check relative path',
        detail: 'Ensure the path matches the actual file location and extension.',
      },
    ],
  },
  {
    id: 'js-json-parse',
    category: 'JSON Parse Failure',
    language: 'javascript',
    severity: 'medium',
    patterns: [
      /Unexpected (token|end of JSON)/i,
      /SyntaxError:.*JSON/i,
      /JSON\.parse/i,
    ],
    keywords: ['JSON', 'parse', 'SyntaxError'],
    summary: 'JSON.parse received invalid JSON input.',
    explanation:
      'The string passed to JSON.parse is not valid JSON. This often happens when an API returns HTML error pages, or when reading an empty or malformed response body.',
    rootCauses: [
      'API returned an HTML error page instead of JSON',
      'Empty response body parsed as JSON',
      'Trailing commas or single quotes in the JSON string',
      'Response was not properly stringified before transmission',
    ],
    fixes: [
      {
        title: 'Validate before parsing',
        detail: 'Check response status and content-type header before parsing.',
        code: 'const res = await fetch(url);\nif (!res.ok) throw new Error(`HTTP ${res.status}`);\nconst data = await res.json();',
      },
      {
        title: 'Wrap in try/catch',
        detail: 'Gracefully handle parse failures.',
        code: 'try {\n  return JSON.parse(raw);\n} catch {\n  return null;\n}',
      },
    ],
  },
  {
    id: 'js-unhandled-promise',
    category: 'Unhandled Promise Rejection',
    language: 'javascript',
    severity: 'high',
    patterns: [
      /UnhandledPromiseRejection/i,
      /Unhandled promise rejection/i,
      /PromiseRejectionHandledWarning/i,
    ],
    keywords: ['async', 'await', 'promise', 'rejection'],
    summary: 'An async operation rejected and no .catch() or try/catch was present.',
    explanation:
      'When a Promise rejects without a handler, Node.js emits a warning (and may crash in future versions). This indicates missing error handling on an async path.',
    rootCauses: [
      'Missing await in an async function',
      'No .catch() on a promise chain',
      'Error thrown inside an async callback without try/catch',
      'Fire-and-forget promise with no error handling',
    ],
    fixes: [
      {
        title: 'Add try/catch around await',
        detail: 'Wrap async operations to handle rejections.',
        code: 'try {\n  const data = await fetchData();\n} catch (err) {\n  handleError(err);\n}',
      },
      {
        title: 'Chain .catch()',
        detail: 'Attach a catch handler to the promise.',
        code: 'fetchData()\n  .then(process)\n  .catch(handleError);',
      },
    ],
  },
  // ─── Network / CORS ─────────────────────────────────────────────────
  {
    id: 'net-cors',
    category: 'CORS Policy Violation',
    language: 'network',
    severity: 'medium',
    patterns: [
      /blocked by CORS policy/i,
      /No 'Access-Control-Allow-Origin'/i,
      /CORS error/i,
    ],
    keywords: ['CORS', 'origin', 'preflight', 'Access-Control'],
    summary: 'The browser blocked a cross-origin request due to missing CORS headers.',
    explanation:
      'Browsers enforce same-origin policy. If the server does not include appropriate Access-Control-Allow-* headers, the browser rejects the response. This is a server-side configuration issue.',
    rootCauses: [
      'Backend missing Access-Control-Allow-Origin header',
      'Preflight (OPTIONS) request not handled by server',
      'Credentials sent but server not allowing credentials',
      'Wildcard origin (*) used with credentials',
    ],
    fixes: [
      {
        title: 'Configure CORS on the server',
        detail: 'Add the proper headers allowing your frontend origin.',
        code: '// Express example\napp.use(cors({ origin: "https://your-frontend.com", credentials: true }));',
      },
      {
        title: 'Use a proxy in development',
        detail: 'Proxy API calls through Vite/Webpack devServer to bypass CORS during development.',
        code: '// vite.config.ts\nserver: { proxy: { "/api": "http://localhost:3001" } }',
      },
    ],
  },
  {
    id: 'net-connection-refused',
    category: 'Connection Refused',
    language: 'network',
    severity: 'high',
    patterns: [
      /ECONNREFUSED/i,
      /ERR_CONNECTION_REFUSED/i,
      /Connection refused/i,
      /fetch failed/i,
    ],
    keywords: ['connection', 'refused', 'timeout', 'ECONNREFUSED', 'fetch'],
    summary: 'The target server is not accepting connections.',
    explanation:
      'The client could reach the host but nothing is listening on the specified port. Either the server process is not running, or a firewall is actively refusing connections.',
    rootCauses: [
      'Server process not started or crashed',
      'Wrong port number in configuration',
      'Firewall blocking the connection',
      'Docker container not exposing the correct port',
    ],
    fixes: [
      {
        title: 'Verify server is running',
        detail: 'Check process list and ensure the service is up.',
        code: '# Check if anything listens on port 3000\nlsof -i :3000',
      },
      {
        title: 'Check port configuration',
        detail: 'Ensure .env / config files use the correct port and host.',
      },
    ],
  },
  // ─── Python ─────────────────────────────────────────────────────────
  {
    id: 'py-key-error',
    category: 'Dictionary Key Error',
    language: 'python',
    severity: 'high',
    patterns: [
      /KeyError:/i,
      /KeyError\s*$/im,
    ],
    keywords: ['KeyError', 'dict', 'Traceback'],
    summary: 'Attempted to access a dictionary key that does not exist.',
    explanation:
      'Python raises KeyError when you index a dict with a key that is not present. Unlike JavaScript, Python dicts do not return undefined for missing keys — they throw.',
    rootCauses: [
      'Hardcoded key name with typo',
      'API response missing expected field',
      'Using wrong key casing (keys are case-sensitive)',
      'Key was deleted earlier in the flow',
    ],
    fixes: [
      {
        title: 'Use .get() with default',
        detail: 'dict.get(key, default) returns default if key is absent.',
        code: 'value = data.get("name", "Unknown")',
      },
      {
        title: 'Check membership first',
        detail: 'Guard with an in-check.',
        code: 'if "name" in data:\n    process(data["name"])',
      },
    ],
  },
  {
    id: 'py-import-error',
    category: 'Import / Module Error',
    language: 'python',
    severity: 'high',
    patterns: [
      /ModuleNotFoundError: No module named/i,
      /ImportError:/i,
    ],
    keywords: ['import', 'module', 'ModuleNotFoundError', 'ImportError'],
    summary: 'Python could not locate or import the specified module.',
    explanation:
      'The module is either not installed, not on sys.path, or the import path contains a typo. Virtual environments frequently cause this when the package is installed globally but not in the active venv.',
    rootCauses: [
      'Package not installed in the active virtual environment',
      'Typo in module name',
      'Circular import between modules',
      'Running script from wrong directory affecting relative imports',
    ],
    fixes: [
      {
        title: 'Install the package',
        detail: 'Use pip inside the correct virtual environment.',
        code: 'pip install <package-name>',
      },
      {
        title: 'Activate the venv',
        detail: 'Ensure the right environment is activated.',
        code: 'source .venv/bin/activate',
      },
    ],
  },
  {
    id: 'py-attribute-error',
    category: 'Attribute Error (NoneType)',
    language: 'python',
    severity: 'high',
    patterns: [
      /AttributeError: 'NoneType' object has no attribute/i,
      /AttributeError:.*has no attribute/i,
    ],
    keywords: ['AttributeError', 'NoneType', 'None'],
    summary: 'Called a method or accessed an attribute on an object that is None.',
    explanation:
      'A function returned None (implicitly or explicitly) and the calling code proceeded to access an attribute on it. This is Python\'s equivalent of the "undefined is not an object" error.',
    rootCauses: [
      'Function missing explicit return statement (returns None)',
      'find/search method returned None on no match',
      'Chained method call where an intermediate returns None',
      'Variable reassigned to None unexpectedly',
    ],
    fixes: [
      {
        title: 'Check for None before access',
        detail: 'Guard attribute access with a None check.',
        code: 'result = get_item()\nif result is not None:\n    result.process()',
      },
      {
        title: 'Use walrus operator',
        detail: 'Combine assignment and check in Python 3.8+.',
        code: 'if (m := re.search(pattern, text)):\n    print(m.group(0))',
      },
    ],
  },
  {
    id: 'py-indentation',
    category: 'Indentation Error',
    language: 'python',
    severity: 'medium',
    patterns: [
      /IndentationError:/i,
      /TabError:/i,
      /unexpected indent/i,
    ],
    keywords: ['IndentationError', 'indent', 'tab', 'whitespace'],
    summary: 'Python detected inconsistent or incorrect indentation.',
    explanation:
      'Python uses indentation to define code blocks. Mixing tabs and spaces, or incorrect indentation levels, triggers this at parse time.',
    rootCauses: [
      'Mixing tabs and spaces in the same file',
      'Copy-pasting code with different indentation style',
      'Editor auto-indent inserted wrong level',
      'Missing indented block after if/for/def/class',
    ],
    fixes: [
      {
        title: 'Convert all to spaces',
        detail: 'Configure editor to use 4 spaces per indent and convert existing tabs.',
        code: '# VS Code: Ctrl+Shift+P → "Convert Indentation to Spaces"',
      },
      {
        title: 'Use a formatter',
        detail: 'Run black or autopep8 to fix automatically.',
        code: 'black my_file.py',
      },
    ],
  },
  {
    id: 'py-index-error',
    category: 'Index Out of Range',
    language: 'python',
    severity: 'medium',
    patterns: [
      /IndexError: list index out of range/i,
      /IndexError:/i,
    ],
    keywords: ['IndexError', 'list', 'index', 'range'],
    summary: 'Accessed a list index that exceeds its bounds.',
    explanation:
      'The list has fewer elements than expected. This often occurs with hardcoded indices, off-by-one loops, or when processing data that may be empty.',
    rootCauses: [
      'Empty list but code assumes at least one element',
      'Off-by-one error in loop range',
      'Hardcoded index on variable-length data',
      'Concurrent modification removing elements',
    ],
    fixes: [
      {
        title: 'Check length before access',
        detail: 'Verify the list is long enough.',
        code: 'if len(items) > idx:\n    val = items[idx]',
      },
      {
        title: 'Use try/except',
        detail: 'Handle out-of-range gracefully.',
        code: 'try:\n    val = items[3]\nexcept IndexError:\n    val = default',
      },
    ],
  },
  {
    id: 'py-type-error',
    category: 'Type / Operand Error',
    language: 'python',
    severity: 'medium',
    patterns: [
      /TypeError: unsupported operand type/i,
      /TypeError:.*argument/i,
      /TypeError:.*NoneType/i,
    ],
    keywords: ['TypeError', 'operand', 'argument', 'int', 'str', 'NoneType'],
    summary: 'An operation received an incompatible type.',
    explanation:
      'Python is dynamically typed but strongly typed — you cannot implicitly concatenate str + int, for example. This error surfaces when types do not match the operation.',
    rootCauses: [
      'Concatenating string and number without conversion',
      'Passing None where a value is expected',
      'Wrong number of arguments to a function',
      'Using an operator on incompatible types (e.g. list + int)',
    ],
    fixes: [
      {
        title: 'Explicit type conversion',
        detail: 'Cast values to compatible types.',
        code: 'result = "Count: " + str(count)',
      },
      {
        title: 'Validate function inputs',
        detail: 'Check types or use type hints with a runtime validator.',
        code: 'def process(value: int) -> str:\n    assert isinstance(value, int)\n    ...',
      },
    ],
  },
  {
    id: 'py-name-error',
    category: 'Name Not Defined',
    language: 'python',
    severity: 'high',
    patterns: [
      /NameError: name '.*' is not defined/i,
      /NameError:/i,
    ],
    keywords: ['NameError', 'not defined', 'undefined'],
    summary: 'A variable or function name was referenced before assignment.',
    explanation:
      'Python could not find the identifier in local or global scope. Common causes include typos, missing imports, or referencing a variable that only exists inside a different function/block.',
    rootCauses: [
      'Typo in variable/function name',
      'Missing import statement',
      'Variable defined inside a function but referenced outside',
      'Conditional assignment that did not execute',
    ],
    fixes: [
      {
        title: 'Fix the typo or add import',
        detail: 'Double-check the name against the definition.',
        code: 'from utils import helper_function',
      },
      {
        title: 'Initialize before conditional use',
        detail: 'Ensure variable is assigned in all code paths.',
        code: 'result = None\nif condition:\n    result = compute()\nprint(result)',
      },
    ],
  },
  // ─── Memory ─────────────────────────────────────────────────────────
  {
    id: 'js-heap-oom',
    category: 'Out of Memory',
    language: 'javascript',
    severity: 'critical',
    patterns: [
      /JavaScript heap out of memory/i,
      /FATAL ERROR.*allocation/i,
      /MemoryError/i,
    ],
    keywords: ['heap', 'memory', 'OOM', 'allocation', 'FATAL'],
    summary: 'The process ran out of available heap memory.',
    explanation:
      'Node.js has a default memory limit (~1.7 GB). Processing very large datasets in memory, memory leaks from closures or event listeners, or infinite growth of arrays/maps will exhaust the heap.',
    rootCauses: [
      'Loading entire large file into memory at once',
      'Memory leak from uncleaned event listeners or intervals',
      'Unbounded cache or array growth',
      'Processing millions of records without streaming',
    ],
    fixes: [
      {
        title: 'Increase memory limit (temporary)',
        detail: 'Raise the Node.js heap limit for large workloads.',
        code: 'node --max-old-space-size=4096 script.js',
      },
      {
        title: 'Use streaming / chunked processing',
        detail: 'Process data in chunks instead of loading all at once.',
        code: 'const stream = fs.createReadStream("big.csv");\nstream.on("data", chunk => process(chunk));',
      },
      {
        title: 'Find and fix leaks',
        detail: 'Use --inspect and Chrome DevTools Memory tab to identify retained objects.',
      },
    ],
  },
]
