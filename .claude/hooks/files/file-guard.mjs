// hook מסוג PreToolUse על Read|Edit|Write|Grep|PowerShell: חוסם קבצים רגישים בפלט JSON (exit 0).
// כשל (קלט פגום, חריגה פנימית) = deny.
import { checkToolCall } from './guard-files.mjs'

// ה-exit מתבצע רק אחרי שהכתיבה ל-stdout הסתיימה, כדי שפלט ה-deny לא יקוטע.
function emitDeny(reason) {
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
    })}\n`,
    () => process.exit(0),
  )
}

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('error', () => emitDeny('שגיאת קריאה מ-stdin, לכן הפעולה נחסמה.'))
process.stdin.on('data', (chunk) => {
  raw += chunk
})
process.stdin.on('end', () => {
  try {
    const { blocked, reason } = checkToolCall(JSON.parse(raw))
    if (blocked) emitDeny(reason)
    else process.exit(0)
  } catch (error) {
    emitDeny(`שגיאה בבדיקת הקובץ (${error instanceof Error ? error.message : 'לא ידועה'}), לכן הפעולה נחסמה.`)
  }
})
