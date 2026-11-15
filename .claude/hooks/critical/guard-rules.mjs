// כללי ה-hook השומר (ראה CONTRACT.html): ניתוח מחרוזת פקודה והחלטה אם לחסום.
// ההגנה מבוססת על ניתוח טקסט בלבד; פקודות עטופות (bash -c), משתנים ו-git aliases עלולים לעבור.

const DELETE_PROGRAMS = new Set(['rm', 'rmdir', 'rd', 'del', 'erase', 'remove-item', 'ri'])
const SLASH_S_PROGRAMS = new Set(['rmdir', 'rd', 'del', 'erase'])
const PUBLISH_SUBCOMMANDS = new Set(['publish', 'unpublish', 'deprecate'])
const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'yarn'])
const GIT_WRITE = new Set(['commit', 'push', 'merge', 'rebase', 'cherry-pick', 'revert', 'am'])
const GIT_DATA_LOSS = new Set(['rm', 'reflog', 'gc', 'prune', 'filter-branch'])
// אפשרויות גלובליות של git שצורכות ערך נפרד לפני שם תת-הפקודה
const GIT_OPTIONS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path'])

const MESSAGES = {
  recursiveDelete:
    'חסום: מחיקה רקורסיבית אסורה על ה-agent והיא שמורה למשתמש. הצג למשתמש רשימת נתיבים והוא יבצע את המחיקה בעצמו.',
  publish: 'חסום: publish שמור למשתמש בלבד. הצג למשתמש מה רצית לפרסם והוא יבצע זאת בעצמו.',
  gitWrite:
    'חסום: פעולת git שכותבת להיסטוריה שמורה למשתמש בלבד. השאר את השינויים בעץ העבודה והמשתמש יבצע את הפעולה.',
  gitDataLoss:
    'חסום: פעולת git שעלולה לגרום לאובדן מידע שמורה למשתמש בלבד. הצג למשתמש מה רצית לעשות והוא יבצע זאת בעצמו.',
}

// מפצל לפקודות משנה בהפרדה ב-&&, ||, ;, |, & ושורות חדשות מחוץ למרכאות, ומחזיר טוקנים ללא מרכאות.
export function splitCommands(input) {
  const commands = []
  let tokens = []
  let current = ''
  let hasToken = false
  let quote = null

  const endToken = () => {
    if (hasToken) tokens.push(current)
    current = ''
    hasToken = false
  }
  const endCommand = () => {
    endToken()
    if (tokens.length > 0) commands.push(tokens)
    tokens = []
  }

  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      hasToken = true
    } else if (ch === ';' || ch === '|' || ch === '&' || ch === '\n' || ch === '\r') {
      endCommand()
    } else if (ch === ' ' || ch === '\t') {
      endToken()
    } else {
      current += ch
      hasToken = true
    }
  }
  endCommand()
  return commands
}

function programName(token) {
  const base = token.split(/[\\/]/).pop().toLowerCase()
  return base.endsWith('.exe') ? base.slice(0, -4) : base
}

const isShortCluster = (token) => /^-[A-Za-z]+$/.test(token)
const hasShortFlag = (args, letters) =>
  args.some((a) => isShortCluster(a) && [...a.slice(1)].some((c) => letters.includes(c)))
const hasLong = (args, name) => args.some((a) => a === name || a.startsWith(`${name}=`))

function isRecursiveDelete(program, args) {
  if (!DELETE_PROGRAMS.has(program)) return false
  const lower = args.map((a) => a.toLowerCase())
  if (SLASH_S_PROGRAMS.has(program) && lower.includes('/s')) return true
  // rm -r / -rf / -fr / --recursive
  if (program === 'rm' && (hasShortFlag(args, 'rR') || hasLong(args, '--recursive'))) return true
  // Remove-Item -Recurse (וקיצורי פרמטר כמו -r, -rec), ri -r, וכינויי PowerShell
  return lower.some((a) => {
    const name = a.split(':')[0]
    return /^-[a-z]+$/.test(name) && name.length >= 2 && '-recurse'.startsWith(name)
  })
}

function checkGit(args) {
  let i = 0
  while (i < args.length && args[i].startsWith('-')) {
    i += GIT_OPTIONS_WITH_VALUE.has(args[i]) ? 2 : 1
  }
  const sub = args[i]?.toLowerCase()
  if (!sub) return null
  const rest = args.slice(i + 1)
  const first = rest.find((a) => !a.startsWith('-'))

  if (GIT_WRITE.has(sub)) return MESSAGES.gitWrite
  if (GIT_DATA_LOSS.has(sub)) return MESSAGES.gitDataLoss
  switch (sub) {
    case 'reset':
      return rest.includes('--hard') ? MESSAGES.gitDataLoss : null
    case 'clean':
      return hasShortFlag(rest, 'n') || hasLong(rest, '--dry-run') ? null : MESSAGES.gitDataLoss
    case 'restore':
      // --staged בלבד מותר; בשילוב --worktree/-W הוא דורס גם את עץ העבודה
      return (hasLong(rest, '--staged') || hasShortFlag(rest, 'S')) && !hasLong(rest, '--worktree') && !hasShortFlag(rest, 'W')
        ? null
        : MESSAGES.gitDataLoss
    case 'checkout':
    case 'switch': {
      const force =
        hasShortFlag(rest, 'fB') || hasLong(rest, '--force') || hasLong(rest, '--discard-changes') ||
        (sub === 'switch' && (hasShortFlag(rest, 'C') || hasLong(rest, '--force-create')))
      // checkout -- <path> / checkout . דורסים שינויים בעץ העבודה
      const discardsPaths = sub === 'checkout' && (rest.includes('--') || rest.includes('.'))
      return force || discardsPaths ? MESSAGES.gitDataLoss : null
    }
    case 'branch':
      return hasShortFlag(rest, 'dDMf') || hasLong(rest, '--delete') || hasLong(rest, '--force')
        ? MESSAGES.gitDataLoss
        : null
    case 'tag':
      return hasShortFlag(rest, 'd') || hasLong(rest, '--delete') ? MESSAGES.gitDataLoss : null
    case 'stash':
      return first === 'drop' || first === 'clear' ? MESSAGES.gitDataLoss : null
    default:
      return null
  }
}

function checkTokens(tokens) {
  // מדלגים על השמות מהצורה VAR=value שלפני הפקודה
  let start = 0
  while (start < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[start])) start++
  if (start >= tokens.length) return null
  const program = programName(tokens[start])
  const args = tokens.slice(start + 1)
  const positional = args.filter((a) => !a.startsWith('-'))

  if (isRecursiveDelete(program, args)) return MESSAGES.recursiveDelete
  if (program === 'find' && args.includes('-delete')) return MESSAGES.recursiveDelete
  // הערך של אפשרות (למשל --tag next) נספר כטקסט רגיל, לכן בודקים את שני הראשונים
  if (
    PACKAGE_MANAGERS.has(program) &&
    positional[0] !== 'run' &&
    positional.slice(0, 2).some((a) => PUBLISH_SUBCOMMANDS.has(a.toLowerCase()))
  ) return MESSAGES.publish
  if (program === 'docker' && positional.slice(0, 2).includes('push')) return MESSAGES.publish
  if (program === 'gh' && positional[0] === 'release' && positional[1] === 'create') return MESSAGES.publish
  if (program === 'git') return checkGit(args)
  return null
}

// מחזיר { blocked, reason? } עבור מחרוזת פקודה של Bash או PowerShell
export function checkCommand(command) {
  if (typeof command !== 'string' || command.trim() === '') return { blocked: false }
  for (const tokens of splitCommands(command)) {
    const reason = checkTokens(tokens)
    if (reason) return { blocked: true, reason }
  }
  return { blocked: false }
}
