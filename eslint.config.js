const correctnessRules = {
  'no-constant-binary-expression': 'error',
  'no-debugger': 'error',
  'no-dupe-else-if': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  'no-func-assign': 'error',
  'no-import-assign': 'error',
  'no-undef': 'error',
  'no-self-assign': 'error',
  'no-unreachable': 'error',
  'no-unreachable-loop': 'error',
  'no-unsafe-finally': 'error',
  'valid-typeof': 'error'
};

module.exports = [
  {
    ignores: [
      'node_modules/**', 'datamine/**/data/**', 'datamine/**/assets/**',
      'datamine/vendor/**', '**/*.min.js', 'datamine-builder/**', 'archive/**', 'tof-fast-datamine/core/**'
    ]
  },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs' },
    rules: correctnessRules
  },
  {
    files: ['server.js', 'version-tracker.js', 'scripts/**/*.js', 'pipeline/**/*.js', 'tests/**/*.js', 'datamine/seq/js/seq-cache-utils.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly', Buffer: 'readonly', clearInterval: 'readonly', clearTimeout: 'readonly',
        console: 'readonly', exports: 'writable', fetch: 'readonly', global: 'readonly', module: 'writable',
        process: 'readonly', require: 'readonly', setImmediate: 'readonly', setInterval: 'readonly',
        setTimeout: 'readonly', structuredClone: 'readonly', URL: 'readonly', URLSearchParams: 'readonly'
      }
    }
  },
  {
    files: ['datamine/**/*.js'],
    languageOptions: {
      globals: {
        alert: 'readonly', Blob: 'readonly', caches: 'readonly', cancelAnimationFrame: 'readonly', clearInterval: 'readonly',
        clearTimeout: 'readonly', console: 'readonly', CSS: 'readonly', CustomEvent: 'readonly', document: 'readonly',
        customElements: 'readonly', DOMParser: 'readonly', fetch: 'readonly', FileReader: 'readonly', history: 'readonly',
        HTMLElement: 'readonly', Image: 'readonly', IntersectionObserver: 'readonly', Node: 'readonly',
        localStorage: 'readonly', location: 'readonly', matchMedia: 'readonly', MutationObserver: 'readonly',
        navigator: 'readonly', requestAnimationFrame: 'readonly', ResizeObserver: 'readonly', sessionStorage: 'readonly',
        setInterval: 'readonly', setTimeout: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
        window: 'readonly', XMLSerializer: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }]
    }
  },
  {
    files: ['datamine/oow/js/oow-bootstrap.js', 'datamine/oow/js/domain/**/*.js', 'datamine/oow/js/adapters/**/*.js'],
    languageOptions: { sourceType: 'module' }
  },
  {
    files: ['datamine/oow/js/support.js'],
    rules: { 'no-unused-vars': 'off' }
  }
];
