const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { processGachaItems } = require('../pipeline/processors/build-items-json.js');

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tof-items-test-'));
}

test('A. Developer order: items in MappingItemId are ordered by developer numeric ID ascending', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    fs.writeFileSync(
      path.join(rawDir, 'MappingItemId.json'),
      JSON.stringify({
        Item_A: 100,
        Item_B: 101,
        Item_C: 105
      })
    );

    const targetFile = path.join(tmp, 'output.json');
    processGachaItems(rawDir, targetFile, tmp);

    const output = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    const keys = Object.keys(output);
    assert.deepEqual(keys, ['100', '101', '105']);
    assert.equal(output['100'].id, 'Item_A');
    assert.equal(output['101'].id, 'Item_B');
    assert.equal(output['105'].id, 'Item_C');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('B. Supplemental range: supplemental items receive maxDeveloperId + 1 sequentially', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    fs.writeFileSync(
      path.join(rawDir, 'MappingItemId.json'),
      JSON.stringify({
        Item_A: 100,
        Item_B: 101,
        Item_C: 105
      })
    );

    fs.writeFileSync(
      path.join(rawDir, 'ST_Item_Oversea.json'),
      JSON.stringify({
        StringTable: {
          KeysToEntries: {
            Custom_A_name: 'Custom A Original',
            Custom_B_name: 'Custom B Original'
          }
        }
      })
    );

    const targetFile = path.join(tmp, 'output.json');
    processGachaItems(rawDir, targetFile, tmp);

    const output = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    const keys = Object.keys(output);
    assert.deepEqual(keys, ['100', '101', '105', '106', '107']);
    assert.equal(output['106'].id, 'Custom_A');
    assert.equal(output['106'].original, 'Custom A Original');
    assert.equal(output['107'].id, 'Custom_B');
    assert.equal(output['107'].original, 'Custom B Original');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('C. Developer namespace grows: supplemental IDs shift automatically without preserving stale NUMs', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    // Build 1: max developer is 105 -> Custom_A becomes 106
    fs.writeFileSync(
      path.join(rawDir, 'MappingItemId.json'),
      JSON.stringify({
        Item_A: 105
      })
    );
    fs.writeFileSync(
      path.join(rawDir, 'ST_Item_Oversea.json'),
      JSON.stringify({
        StringTable: {
          KeysToEntries: {
            Custom_A_name: 'Custom A'
          }
        }
      })
    );

    const targetFile = path.join(tmp, 'output.json');
    processGachaItems(rawDir, targetFile, tmp);
    let output = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    assert.equal(output['106'].id, 'Custom_A');

    // Build 2: developer mapping now reaches 120 -> Custom_A must shift to 121 (not retain 106)
    fs.writeFileSync(
      path.join(rawDir, 'MappingItemId.json'),
      JSON.stringify({
        Item_A: 105,
        Item_New: 120
      })
    );
    processGachaItems(rawDir, targetFile, tmp);
    output = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    assert.equal(output['106'], undefined);
    assert.equal(output['120'].id, 'Item_New');
    assert.equal(output['121'].id, 'Custom_A');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('D. Gaps in developer IDs: first supplemental is maxDeveloperId + 1, not filling developer gaps', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    fs.writeFileSync(
      path.join(rawDir, 'MappingItemId.json'),
      JSON.stringify({
        Item_1: 1,
        Item_2: 2,
        Item_10: 10
      })
    );
    fs.writeFileSync(
      path.join(rawDir, 'ST_Item_Oversea.json'),
      JSON.stringify({
        StringTable: {
          KeysToEntries: {
            Custom_Item_name: 'Supplemental Item'
          }
        }
      })
    );

    const targetFile = path.join(tmp, 'output.json');
    processGachaItems(rawDir, targetFile, tmp);
    const output = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    const keys = Object.keys(output);
    assert.deepEqual(keys, ['1', '2', '10', '11']);
    assert.equal(output['11'].id, 'Custom_Item');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('E. Numeric sort: developer rows are sorted by numeric value rather than string lexicographical order', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    // Intentionally shuffled insertion order
    fs.writeFileSync(
      path.join(rawDir, 'MappingItemId.json'),
      JSON.stringify({
        Item_10: 10,
        Item_2: 2,
        Item_1: 1
      })
    );

    const targetFile = path.join(tmp, 'output.json');
    processGachaItems(rawDir, targetFile, tmp);
    const output = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    const keys = Object.keys(output);
    assert.deepEqual(keys, ['1', '2', '10']);
    assert.equal(output['1'].id, 'Item_1');
    assert.equal(output['2'].id, 'Item_2');
    assert.equal(output['10'].id, 'Item_10');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('F. No non-numeric NUM: all generated output keys are valid positive integers', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    fs.writeFileSync(
      path.join(rawDir, 'MappingItemId.json'),
      JSON.stringify({
        stave_thunder_plasm: 1,
        Hacker_Norn_collection_099: 8234
      })
    );

    const targetFile = path.join(tmp, 'output.json');
    processGachaItems(rawDir, targetFile, tmp);
    const output = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

    for (const [key, val] of Object.entries(output)) {
      assert.match(key, /^\d+$/);
      assert(Number(key) > 0);
      assert.notEqual(key, val.id);
    }
    assert.equal(output['8234'].id, 'Hacker_Norn_collection_099');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('G. Duplicate developer numeric ID blocks publication and fails the processor', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    fs.writeFileSync(
      path.join(rawDir, 'MappingItemId.json'),
      JSON.stringify({
        Item_A: 100,
        Item_B: 100 // Duplicate ID 100
      })
    );

    const targetFile = path.join(tmp, 'output.json');
    assert.throws(() => {
      processGachaItems(rawDir, targetFile, tmp);
    }, /Duplicate developer numeric ID 100/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('H. Duplicate item enrichment: supplemental items already in developer mapping enrich existing row without duplicating', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    fs.writeFileSync(
      path.join(rawDir, 'MappingItemId.json'),
      JSON.stringify({
        stave_thunder: 101
      })
    );
    fs.writeFileSync(
      path.join(rawDir, 'ST_Item_Oversea.json'),
      JSON.stringify({
        StringTable: {
          KeysToEntries: {
            stave_thunder_name: 'Thunder Stave Enriched Name'
          }
        }
      })
    );

    const targetFile = path.join(tmp, 'output.json');
    processGachaItems(rawDir, targetFile, tmp);
    const output = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

    // Should only have 1 item with NUM 101, enriched with original name
    assert.deepEqual(Object.keys(output), ['101']);
    assert.equal(output['101'].id, 'stave_thunder');
    assert.equal(output['101'].original, 'Thunder Stave Enriched Name');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Real 6.3.0 dataset meets all Items contract invariants (12,855 rows)', () => {
  const realFile = path.resolve(__dirname, '../datamine/items/data/merged_mapping_with_original.json');
  assert(fs.existsSync(realFile));

  const data = JSON.parse(fs.readFileSync(realFile, 'utf8'));
  const keys = Object.keys(data);
  assert.equal(keys.length, 12855, `Expected 12855 items, got ${keys.length}`);

  const nums = keys.map(Number);
  const minNum = Math.min(...nums);
  const maxNum = Math.max(...nums);
  assert.equal(minNum, 1);
  assert.equal(maxNum, 12855);

  // Assert all keys are strictly sequential integers 1..12855
  for (let i = 0; i < keys.length; i++) {
    const expected = String(i + 1);
    assert.equal(keys[i], expected, `Key at index ${i} should be ${expected}, got ${keys[i]}`);
  }

  // Check developer boundary (12,754 developer items)
  assert.equal(data['1'].id, 'stave_thunder_plasm');
  assert.equal(data['12754'].id, 'bag_StrengthenStone_kailo_OS');

  // Check supplemental boundary (101 supplemental items starting at maxDeveloperId + 1)
  assert.equal(data['12755'].id, 'Anniversary3_LoginGift1_OS');
  assert.equal(data['12855'].id, 'Violin_Thunder_trial_OS');

  // Check Hacker items in developer range
  assert.equal(data['8136'].id, 'Hacker_Norn_collection_001');
  assert.equal(data['8234'].id, 'Hacker_Norn_collection_099');
  assert.equal(data['8235'].id, 'Hacker_Norn_collection_100');
  assert.equal(data['8236'].id, 'Hacker_Norn_collection_101');
  assert.equal(data['8237'].id, 'Hacker_Norn_collection_102');
  assert.equal(data['8238'].id, 'Hacker_Norn_collection_103');

  // Check curated renames preserved
  assert.equal(data['5793'].id, 'imitation_fashion_43');
  assert.equal(data['5793'].rename, 'Ling Han Summer skin');
  assert.equal(data['5794'].id, 'imitation_fashion_43_w');
  assert.equal(data['5794'].rename, 'Ling Han Summer weapon skin');
});

test('Frontend items-core processes normalized rows with correct NUM, search, and filter behavior', () => {
  const realFile = path.resolve(__dirname, '../datamine/items/data/merged_mapping_with_original.json');
  const rawPayload = JSON.parse(fs.readFileSync(realFile, 'utf8'));

  // Test row normalization (items-core logic)
  const rows = Object.entries(rawPayload).map(([key, item]) => ({
    key: String(key),
    num: String(key),
    id: String(item?.id || ''),
    name: String(item?.name || ''),
    original: String(item?.original || ''),
    rename: String(item?.rename || ''),
    searchText: [
      String(key),
      String(item?.id || ''),
      String(item?.name || ''),
      String(item?.original || ''),
      String(item?.rename || '')
    ].join('\n').toLocaleLowerCase()
  })).sort((a, b) => Number(a.num) - Number(b.num));

  // Top row check
  assert.equal(rows[0].num, '1');
  assert.equal(rows[0].id, 'stave_thunder_plasm');

  // Search for Hacker_Norn_collection_099
  const searchNeedle = 'hacker_norn_collection_099';
  const matched = rows.filter(r => r.searchText.includes(searchNeedle));
  assert.equal(matched.length, 1);
  assert.equal(matched[0].num, '8234');
  assert.equal(matched[0].id, 'Hacker_Norn_collection_099');

  // Search for supplemental item
  const suppNeedle = 'anniversary3_logingift1_os';
  const suppMatched = rows.filter(r => r.searchText.includes(suppNeedle));
  assert.equal(suppMatched.length, 1);
  assert.equal(suppMatched[0].num, '12755');
  assert.equal(suppMatched[0].id, 'Anniversary3_LoginGift1_OS');

  // Filter for Renamed
  const renamedOnly = rows.filter(r => r.rename.trim());
  assert.equal(renamedOnly.length, 2);
  assert.equal(renamedOnly[0].num, '5793');
  assert.equal(renamedOnly[0].id, 'imitation_fashion_43');
  assert.equal(renamedOnly[1].num, '5794');
  assert.equal(renamedOnly[1].id, 'imitation_fashion_43_w');
});

test('Items JSON Export serializes complete Gacha dataset with all fields, numeric NUM, and empty string preservation', () => {
  const { normalizeRows, serializeDatasetForExport } = require('../datamine/items/js/items-core.js');
  const realFile = path.resolve(__dirname, '../datamine/items/data/merged_mapping_with_original.json');
  const rawPayload = JSON.parse(fs.readFileSync(realFile, 'utf8'));

  const rows = normalizeRows(rawPayload);
  assert.equal(rows.length, 12855);

  const { payload, filename, json } = serializeDatasetForExport(rows, 'gacha', '6.3.0');

  // Payload structure
  assert.equal(payload.dataset, 'gacha');
  assert.equal(payload.snapshot, '6.3.0');
  assert.equal(payload.count, 12855);
  assert.equal(payload.items.length, 12855);
  assert.equal(filename, 'tof-items-gacha-6.3.0.json');

  // First item has numeric NUM and all fields
  const first = payload.items[0];
  assert.strictEqual(first.num, 1);
  assert.equal(typeof first.num, 'number');
  assert.equal(first.id, 'stave_thunder_plasm');
  assert.equal(first.original, '圣痕权杖数据核心');
  assert.equal(first.name, rawPayload['1'].name, 'Export must preserve the built display name');
  assert.equal(first.rename, '');
  assert.equal(first.quality, 'ITEM_QUALITY_EPIC');

  // Developer row with empty values preserves empty string fields
  const devRow = payload.items.find(item => item.id === 'bag_StrengthenStone_kailo_OS');
  assert.ok(devRow);
  assert.strictEqual(devRow.num, 12754);
  assert.equal(typeof devRow.num, 'number');
  assert.equal(devRow.name, rawPayload['12754'].name, 'Export must preserve empty or populated built names');
  assert.equal(devRow.original, '');
  assert.equal(devRow.rename, '');
  assert.equal(devRow.quality, '');

  // Supplemental row check
  const last = payload.items[payload.items.length - 1];
  assert.strictEqual(last.num, 12855);
  assert.equal(last.id, 'Violin_Thunder_trial_OS');

  // JSON string is valid and parseable
  const parsed = JSON.parse(json);
  assert.equal(parsed.count, 12855);
});

test('Items JSON Export serializes complete MMO dataset without cross-mode leakage', () => {
  const { normalizeRows, serializeDatasetForExport } = require('../datamine/items/js/items-core.js');
  const mmoFile = path.resolve(__dirname, '../datamine/items/data/merged_mapping_with_original_mmo.json');
  const rawMmo = JSON.parse(fs.readFileSync(mmoFile, 'utf8'));

  const rows = normalizeRows(rawMmo);
  assert.equal(rows.length, 1594);

  const { payload, filename } = serializeDatasetForExport(rows, 'mmo', '6.3.0');

  assert.equal(payload.dataset, 'mmo');
  assert.equal(payload.count, 1594);
  assert.equal(payload.items.length, 1594);
  assert.equal(filename, 'tof-items-mmo-6.3.0.json');

  const firstMmo = payload.items[0];
  assert.strictEqual(firstMmo.num, 1);
  assert.equal(typeof firstMmo.num, 'number');
  assert.equal(firstMmo.id, 'BluePrint_T0.2_Equip1');
  assert.equal(firstMmo.original, '突击臂甲图纸');
  assert.equal(firstMmo.name, rawMmo['1'].name, 'Export must preserve the MMO built display name');
  assert.equal(firstMmo.rename, '');
});

test('Items JSON Export is independent from UI search query and active filter state', () => {
  const { normalizeRows, serializeDatasetForExport } = require('../datamine/items/js/items-core.js');
  const realFile = path.resolve(__dirname, '../datamine/items/data/merged_mapping_with_original.json');
  const rawPayload = JSON.parse(fs.readFileSync(realFile, 'utf8'));
  const rows = normalizeRows(rawPayload);

  // Simulated search: 1 matching row in UI
  const filteredRows = rows.filter(r => r.id === 'Hacker_Norn_collection_099');
  assert.equal(filteredRows.length, 1);

  // Full data model passed to export produces full 12,855 rows
  const { payload } = serializeDatasetForExport(rows, 'gacha');
  assert.equal(payload.count, 12855);
  assert.equal(payload.items.length, 12855);
});

test('Items JSON Export handles snapshot metadata presence and fallback gracefully', () => {
  const { serializeDatasetForExport } = require('../datamine/items/js/items-core.js');
  const mockRows = [{ num: 1, id: 'test_item', name: '', original: '', rename: '', quality: '' }];

  // Without snapshot
  const resWithout = serializeDatasetForExport(mockRows, 'gacha', '');
  assert.equal(resWithout.filename, 'tof-items-gacha.json');
  assert.equal(resWithout.payload.snapshot, undefined);

  // With snapshot
  const resWith = serializeDatasetForExport(mockRows, 'mmo', '6.3.0');
  assert.equal(resWith.filename, 'tof-items-mmo-6.3.0.json');
  assert.equal(resWith.payload.snapshot, '6.3.0');
});
