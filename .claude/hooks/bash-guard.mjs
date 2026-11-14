// hook מסוג PreToolUse על Bash ו-PowerShell: חוסם פקודות שמורות למשתמש (exit 2 + הודעה בעברית).
// קלט פגום או כלי אחר אינם חוסמים.
import { checkCommand } from './guard-rules.mjs'

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  raw += chunk
})
process.stdin.on('end', () => {
  let command
  try {
    command = JSON.parse(raw)?.tool_input?.command
  } catch {
    process.exit(0)
  }
  const { blocked, reason } = checkCommand(command)
  if (blocked) {
    process.stderr.write(`${reason}\n`)
    process.exit(2)
  }
  process.exit(0)
})
