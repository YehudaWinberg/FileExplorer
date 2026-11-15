// hook מסוג PostToolUse על Edit|Write: מחזיר לסוכן משוב כשנכתבה גישה ישירה ל-File System API תחת components.
// הכתיבה כבר בוצעה, לכן זה משוב (decision: block) ולא חסימה. כשל פנימי מדווח לסוכן ולא נבלע.
import { checkToolCall } from './guard-fs-service.mjs'

function emit(reason) {
  process.stdout.write(
    `${JSON.stringify({ decision: 'block', reason, hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: reason } })}\n`,
    () => process.exit(0),
  )
}

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('error', () => emit('hook בדיקת components: שגיאת קריאה מ-stdin, הכתיבה לא נבדקה.'))
process.stdin.on('data', (chunk) => {
  raw += chunk
})
process.stdin.on('end', () => {
  try {
    const { violation, reason } = checkToolCall(JSON.parse(raw))
    if (violation) emit(reason)
    else process.exit(0)
  } catch (error) {
    emit(`hook בדיקת components: שגיאה (${error instanceof Error ? error.message : 'לא ידועה'}), הכתיבה לא נבדקה.`)
  }
})
