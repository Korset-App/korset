const fs = require('fs')

let c = fs.readFileSync('docs/CONTEXT.md', 'utf8')

const V3_BLOCK = `- \u{1f50e} **Catalog Search V3 \u2014 complete overhaul (2026-05-22)**:
  \u0412\u0441\u0435 9 \u044d\u0442\u0430\u043f\u043e\u0432 \u043f\u043e\u0438\u0441\u043a\u0430 (0-9) \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u044b. \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b QA: **82/83 PASS** \u043d\u0430 \u0436\u0438\u0432\u043e\u043c MARS (10K+ \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u043e\u0432).
  - SQL RPC v3: additive scoring (SUM), 16 \u0441\u0438\u0433\u043d\u0430\u043b\u043e\u0432, relevance floor, EAN prefix, ILIKE escaping
  - search_brand_aliases (73) + search_category_keywords (321) \u0432 Supabase
  - JS scorer: alias tokens \u043a\u0430\u043a \u0430\u043b\u044c\u0442\u0435\u0440\u043d\u0430\u0442\u0438\u0432\u044b, intent \u0438\u0437 NAME_KEYWORDS (~250), QUERY_ALIASES (~90)
  - Merge + Sort: relevanceTier primary sort, re-score \u043f\u043e\u0441\u043b\u0435 merge
  - UX: KZ \u043d\u043e\u0440\u043c\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f, intent-based suggestions, client pre-filter
  - \u0414\u0435\u0442\u0430\u043b\u0438: docs/vault/changelog/2026-05-22-catalog-search-v3-complete.md

`

const OLD_MARKER = '- \u{1f50e} **Catalog Search upgrade \u2014 Stage 1 audit**:'

c = c.replace(OLD_MARKER, V3_BLOCK + OLD_MARKER)
fs.writeFileSync('docs/CONTEXT.md', c)
console.log('CONTEXT.md updated')
