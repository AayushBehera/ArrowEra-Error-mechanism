export interface ErrorExample {
  label: string
  language: string
  text: string
}

export const examples: ErrorExample[] = [
  {
    label: 'JS: Cannot read properties of undefined',
    language: 'JavaScript',
    text: `TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (src/components/UserList.tsx:14:22)
    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:14985:18)
    at mountIndeterminateComponent (node_modules/react-dom/cjs/react-dom.development.js:17811:13)`,
  },
  {
    label: 'JS: Module not found',
    language: 'JavaScript',
    text: `Error: Cannot find module '@/utils/helpers'
Require stack:
- /app/src/server.js
- /app/src/index.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1075:15)
    at Module._load (node:internal/modules/cjs/loader:920:27)
    code: 'MODULE_NOT_FOUND'`,
  },
  {
    label: 'JS: Maximum call stack',
    language: 'JavaScript',
    text: `RangeError: Maximum call stack size exceeded
    at Object.render (src/App.tsx:22:5)
    at Object.render (src/App.tsx:22:5)
    at Object.render (src/App.tsx:22:5)
    at Object.render (src/App.tsx:22:5)`,
  },
  {
    label: 'Network: CORS blocked',
    language: 'Network',
    text: `Access to fetch at 'https://api.example.com/data' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`,
  },
  {
    label: 'Python: KeyError',
    language: 'Python',
    text: `Traceback (most recent call last):
  File "app/views.py", line 42, in get_user
    name = response["user"]["display_name"]
KeyError: 'display_name'`,
  },
  {
    label: 'Python: ModuleNotFoundError',
    language: 'Python',
    text: `Traceback (most recent call last):
  File "main.py", line 1, in <module>
    import pandas as pd
ModuleNotFoundError: No module named 'pandas'`,
  },
  {
    label: 'Python: AttributeError NoneType',
    language: 'Python',
    text: `Traceback (most recent call last):
  File "process.py", line 28, in run
    result = parser.find("div").get_text()
AttributeError: 'NoneType' object has no attribute 'get_text'`,
  },
  {
    label: 'JS: Unhandled Promise Rejection',
    language: 'JavaScript',
    text: `UnhandledPromiseRejectionWarning: Error: connect ECONNREFUSED 127.0.0.1:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)
(Use \`node --trace-warnings ...\` to show where the warning was created)
UnhandledPromiseRejectionWarning: Unhandled promise rejection.`,
  },
]
