export const DATA_SOURCES = Object.freeze({
  index: ['./data/index.json?v=13'],
  current: ['./data/current/summary.json?v=13'],
  seasonsBase: './data/seasons/',
  fceIndex: ['../fce/data/fce-index.json?v=7', '/datamine/fce/data/fce-index.json?v=7']
});

export function extractBossNumber(value) {
  if (!value) return null;
  const match = String(value).match(/boss(?:_hum)?_?#?0*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

export function getActiveSeasonNumber(seasons, now = new Date()) {
  if (!seasons || !seasons.length) return 1;
  const active = seasons.find((season) => {
    if (!season.startISO || !season.endISO) return false;
    const start = new Date(season.startISO.replace(/-/g, '/'));
    const end = new Date(season.endISO.replace(/-/g, '/') + ' 23:59:59');
    return now >= start && now <= end;
  });
  if (active) return active.season;

  const started = seasons.filter((season) => {
    if (!season.startISO) return false;
    return now >= new Date(season.startISO.replace(/-/g, '/'));
  });
  if (started.length) return started[started.length - 1].season;
  return seasons[seasons.length - 1].season;
}

export async function fetchFirstJson(urls, fetchImpl = fetch) {
  for (const url of urls) {
    try {
      const response = await fetchImpl(url);
      if (response.ok) return await response.json();
    } catch {
      // A later source may still be available in exported or preview layouts.
    }
  }
  return null;
}

export function parseOowDeepLink(store) {
  if (!store) return null;
  const params = store.read();
  const mode = params.mode === 'mmo' ? 'mmo' : (params.mode === 'standard' ? 'standard' : null);
  const seasonNumber = Number(params.s);
  const season = params.s !== undefined && params.s !== '' && Number.isFinite(seasonNumber) ? seasonNumber : null;
  const tab = params.tab === 'charts' || params.tab === 'difficulty' || params.tab === 'table' ? params.tab : null;
  const floorNumber = Number(params.floor);
  const floor = params.floor !== undefined && params.floor !== '' && Number.isFinite(floorNumber) ? floorNumber : null;
  const mob = typeof params.mob === 'string' && params.mob ? params.mob : null;
  return mode || season != null || tab || floor != null || mob ? { mode, season, tab, floor, mob } : null;
}

export function resolveFceBoss(monster, fceIndex) {
  if (!monster || !Array.isArray(fceIndex?.bosses)) return null;
  const isBoss = monster.monsterType === 'BS_MONSTER_BOSS'
    || monster.type === 'boss'
    || monster.isBoss
    || /boss_/i.test(monster.codeName || '')
    || /boss/i.test(monster.bossId || '')
    || /boss_/i.test(monster.blueprint || '');
  if (!isBoss) return null;
  const target = monster.codeName || monster.blueprint || monster.bossId || monster.id || '';
  const number = extractBossNumber(target);
  if (number == null) return null;
  return fceIndex.bosses.find((boss) => Number(boss.boss_num) === number || extractBossNumber(boss.boss_id || boss.slug) === number) || null;
}

export function pluralRu(count, one, few, many) {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
