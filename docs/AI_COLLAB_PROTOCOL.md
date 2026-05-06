# AI Collaboration Protocol — Körset

> Обновлено: 2026-05-06.
> Роль файла: безопасная параллельная работа Codex, OpenCode, Windsurf, Antigravity и других ИИ-агентов.
> Рабочие режимы задач: `docs/AI_TASK_MODES.md`. Стартовые промпты: `docs/PROMPT_STARTERS.md`.

---

## 1. Главное Правило

Одновременно код пишут максимум 2 агента.

Остальные в это время:
- исследуют;
- делают review;
- готовят следующий изолированный блок;
- не меняют файлы из чужой write-zone.

---

## 2. Роли По Умолчанию

| Agent | Best use | Avoid by default |
| --- | --- | --- |
| Codex | Интеграция, repo consistency, tests, docs/memory, cross-system fixes | Долгие изолированные UI-полировки без необходимости |
| OpenCode | Быстрые локальные правки, CLI-задачи, scripted checks, небольшие bugfixes | Широкие архитектурные решения без проверки контекста |
| Windsurf | UI/UX, компоненты, CSS, premium mobile polish | SQL/RLS/data pipeline без явного назначения |
| Antigravity | Исследование, broad reasoning, архитектура, data/backend-heavy planning | Мелкие визуальные правки без write-zone |

Это роли по умолчанию, не жёсткая кастовая система. Если агент лучше подходит под конкретную задачу, владелец может назначить его явно.

---

## 3. Write-Zone

У каждой активной параллельной задачи должен быть:
- один владелец;
- один `task_id`;
- явный список файлов или папок, которые можно менять.

Нельзя:
- менять файлы, занятые другой моделью;
- “чуть-чуть поправить рядом” в чужой активной зоне;
- переписывать чужой незавершённый код без отдельного решения владельца.

---

## 4. Как Начинать Параллельную Задачу

Перед стартом агент читает:
1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/AI_TASK_MODES.md`
4. `docs/AI_COLLAB_PROTOCOL.md`
5. `docs/AI_TASK_BOARD.md`
6. `docs/AI_HANDOFF.md`

Затем:
1. Найти свою задачу в `AI_TASK_BOARD`.
2. Убедиться, что write-zone свободна.
3. Поменять статус задачи на `in_progress`.
4. Записать, какие файлы берёт в работу.

Для одиночной задачи task board можно не использовать.

---

## 5. Ответственность За Проверки

Если после работы агента падает проверка, связанная с его изменениями, агент чинит её до handoff или честно помечает blocker.

Нельзя передавать задачу со сломанным build, если build должен был проходить для этой зоны.

Recommended checks:

```bash
npm run check:agent:docs
npm run check:agent
npm run check:agent:ui
npm run check:agent:full
```

---

## 6. Как Завершать Параллельную Задачу

Перед завершением агент обязан:
1. Записать в `docs/AI_HANDOFF.md`:
   - что сделано;
   - какие файлы изменены;
   - что осталось;
   - риски/ограничения;
   - что нельзя трогать следующему агенту;
   - какие проверки прошли.
2. Обновить статус в `docs/AI_TASK_BOARD.md`.
3. Освободить write-zone.

---

## 7. Default Zones

Codex:
- `docs/CONTEXT.md`
- `docs/vault/**`
- `tests/**`
- integration files such as `src/App.jsx`, `src/contexts/**`, i18n utilities and cross-system glue.

Antigravity / backend-heavy:
- `supabase/migrations/**`
- `scripts/**`
- data/import/resolver/performance modules.

Windsurf / UI-heavy:
- `src/screens/**`
- `src/components/**`
- `src/index.css`
- visual UX flows and presentation layer.

OpenCode:
- small local fixes;
- scripts/checks;
- narrow bugfixes;
- docs updates.

These are defaults. A task-specific write-zone overrides them.

---

## 8. Осторожный Режим

Use one writer and reviewers only for:
- auth;
- RLS;
- migrations;
- risky refactors;
- shared contexts;
- product scope changes.

---

## 9. Current Priority

Do not keep detailed priorities here. Use:
- `docs/ROADMAP_PILOT_V1.md` for current priorities;
- `docs/AI_TASK_BOARD.md` for active parallel work;
- `docs/CONTEXT.md` for latest stable project context.

---

## 10. Короткое Правило Для Владельца

Если сомневаешься, кому отдавать задачу:
- данные, БД, миграции, пайплайны, производительность → Antigravity или Codex;
- экран, UX, интерфейс, mobile polish, визуальная подача → Windsurf или Codex;
- интеграция, добивание до конца, тесты, repo consistency, память → Codex;
- мелкий локальный bugfix или CLI-проверка → OpenCode или Codex.
