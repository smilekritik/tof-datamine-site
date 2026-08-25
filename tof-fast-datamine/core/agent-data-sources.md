# Data-source quick reference

This directory exports the exact source tables listed in `export-datamine-config.json`. The downstream processor converts them as follows:

| Sources | Output family |
| --- | --- |
| three `MappingItemId*.json` files + `ST_Item_Oversea.json` | Gacha items |
| four MMO item/cooking/life-job tables | MMO items |
| overseas/base monster static tables | Sequential and OOW health |
| OOW season, round, pool, effect-tip, curve, balance, and MMO tables | OOW datasets |
| EN/RU `Game.json` + overseas FCE boss catalog | FCE parser review artifacts |

The FCE runtime is curated per boss in `datamine/fce/data/bosses/*.json` and indexed by `fce-index.json`. `fce-new-mechanics-candidates.json` is not a current generated/runtime contract. Multype is produced by a separate scanner.

For exact formulas and processing order, use the repository's `scripts/PIPELINE_GUIDE.md` after handoff.
