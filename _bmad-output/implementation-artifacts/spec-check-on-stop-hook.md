---
title: 'Stop hook שמאמת npm run check'
type: 'feature'
created: '2026-11-15'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** הכלל "משימה לא גמורה כשה-check נכשל" תלוי בזיכרון הסוכן, ולכן משימה יכולה להיסגר עם check אדום.

**Approach:** hook מסוג Stop ב-`.claude/hooks/check-on-stop/` לפי `_bmad-output/specs/spec-check-on-stop-hook/SPEC.md` ו-`decision-table.md`: לוגיקה טהורה, אדאפטר דק ובדיקות. fail open, ניסיון תיקון אחד לפי `stop_hook_active`, בלי רישום ב-`settings.json`.

</frozen-after-approval>

## Implementation Notes

- הבדיקות נכתבות ב-vitest (כמו ב-hooks הקיימים), ולא ב-`node:test` כפי שנכתב ב-SPEC: vitest קולט `*.test.mjs` מתחת ל-`.claude`, וקובץ `node:test` היה נכשל תחת `npm run check`.
