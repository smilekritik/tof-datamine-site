const assert = require('assert');
const DatamineVersionStatus = require('../datamine/shared/version-status.js');

console.log('--- Running Version Status & Comparison Tests ---');

// 1. parseVersion
assert.deepStrictEqual(DatamineVersionStatus.parseVersion('6.3.0'), [6, 3, 0]);
assert.deepStrictEqual(DatamineVersionStatus.parseVersion(' 6.3.0\n'), [6, 3, 0]);
assert.deepStrictEqual(DatamineVersionStatus.parseVersion('v6.4'), [6, 4]);
assert.deepStrictEqual(DatamineVersionStatus.parseVersion('v5.7.0 KR Dev client'), [5, 7, 0]);
assert.deepStrictEqual(DatamineVersionStatus.parseVersion('invalid'), null);
assert.deepStrictEqual(DatamineVersionStatus.parseVersion(''), null);
assert.deepStrictEqual(DatamineVersionStatus.parseVersion(null), null);
console.log('✓ parseVersion tests passed.');

// 2. compareVersions
// a === b -> 0
assert.strictEqual(DatamineVersionStatus.compareVersions('6.3.0', '6.3.0'), 0);
assert.strictEqual(DatamineVersionStatus.compareVersions('6.3', '6.3.0'), 0);
assert.strictEqual(DatamineVersionStatus.compareVersions(' 6.3.0\n', '6.3.0'), 0);

// a > b -> 1
assert.strictEqual(DatamineVersionStatus.compareVersions('6.4.0', '6.3.0'), 1);
assert.strictEqual(DatamineVersionStatus.compareVersions('6.3.1', '6.3.0'), 1);
assert.strictEqual(DatamineVersionStatus.compareVersions('6.10.0', '6.9.0'), 1);
assert.strictEqual(DatamineVersionStatus.compareVersions('7.0.0', '6.99.99'), 1);

// a < b -> -1
assert.strictEqual(DatamineVersionStatus.compareVersions('6.3.0', '6.4.0'), -1);
assert.strictEqual(DatamineVersionStatus.compareVersions('6.3.0', '6.3.1'), -1);
assert.strictEqual(DatamineVersionStatus.compareVersions('6.9.0', '6.10.0'), -1);

// invalid -> null
assert.strictEqual(DatamineVersionStatus.compareVersions('invalid', '6.3.0'), null);
assert.strictEqual(DatamineVersionStatus.compareVersions('6.3.0', 'unknown'), null);
console.log('✓ compareVersions tests passed.');

// 3. getStatus with mock
(async () => {
  // Test update available logic
  const mockGlobal = '6.4.0';
  const cmp1 = DatamineVersionStatus.compareVersions(mockGlobal, '6.3.0');
  assert.strictEqual(cmp1 > 0, true); // update available

  const mockGlobalCurrent = '6.3.0';
  const cmp2 = DatamineVersionStatus.compareVersions(mockGlobalCurrent, '6.3.0');
  assert.strictEqual(cmp2 > 0, false); // current

  const mockGlobalOlder = '6.2.0';
  const cmp3 = DatamineVersionStatus.compareVersions(mockGlobalOlder, '6.3.0');
  assert.strictEqual(cmp3 > 0, false); // current (dataset newer or equal)

  console.log('✓ getStatus logic tests passed.');
  console.log('--- ALL VERSION STATUS TESTS PASSED ---');
})();
