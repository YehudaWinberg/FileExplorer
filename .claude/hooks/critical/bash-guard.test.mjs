import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkCommand } from './guard-rules.mjs'

const script = join(process.cwd(), '.claude', 'hooks', 'critical', 'bash-guard.mjs')

function runHook(input) {
  return spawnSync(process.execPath, [script], { input, encoding: 'utf8' })
}

const blocked = (command) => expect(checkCommand(command).blocked, command).toBe(true)
const allowed = (command) => expect(checkCommand(command).blocked, command).toBe(false)

describe('מחיקה רקורסיבית', () => {
  it('חוסם', () => {
    for (const c of [
      'rm -rf node_modules', 'rm -r dir', 'rm -fr dir', 'rm -Rf dir', 'rm --recursive dir', 'rm -f -r dir',
      'rmdir /s /q dir', 'RD /S dir', 'del /s *.log', 'del /f /s x',
      'Remove-Item -Recurse dir', 'Remove-Item dir -Recurse -Force', 'Remove-Item -r dir', 'Remove-Item -Rec dir',
      'ri -r dir', 'ri dir -Recurse:$true',
      'find . -name "*.tmp" -delete',
    ]) blocked(c)
  })
  it('מתיר מחיקת קובץ בודד', () => {
    for (const c of ['rm file.txt', 'rm -f file.txt', 'del file.txt', 'Remove-Item file.txt', 'Remove-Item -Force file.txt', 'find . -name x']) allowed(c)
  })
  it('ההודעה מפנה את המשתמש', () => {
    expect(checkCommand('rm -rf x').reason).toContain('מחיקה רקורסיבית')
  })
})

describe('publish', () => {
  it('חוסם', () => {
    for (const c of [
      'npm publish', 'pnpm publish --access public', 'yarn publish', 'npm unpublish pkg', 'npm deprecate pkg "x"',
      'npm --tag next publish', 'docker push img:tag', 'gh release create v1',
    ]) blocked(c)
  })
  it('מתיר build ו-install', () => {
    for (const c of ['npm run build', 'npm install', 'npm i', 'yarn install', 'docker build .', 'gh release list']) allowed(c)
  })
})

describe('git: כתיבה', () => {
  it('חוסם', () => {
    for (const c of [
      'git commit -m x', 'git push', 'git push --force', 'git push -f origin main', 'git merge x', 'git rebase main',
      'git cherry-pick abc', 'git revert abc', 'git am patch', 'git -C repo push', 'git -c user.name=x commit',
      'git add . && git commit -m x', 'GIT_TRACE=1 git push', '/usr/bin/git push', 'git.exe push',
    ]) blocked(c)
  })
})

describe('git: אובדן מידע', () => {
  it('חוסם', () => {
    for (const c of [
      'git reset --hard', 'git reset --hard HEAD~1', 'git clean -fd', 'git clean -f', 'git restore file', 'git restore .',
      'git checkout -f main', 'git checkout --force main', 'git switch --discard-changes x', 'git switch -f x',
      'git checkout -- file', 'git checkout .', 'git restore --staged --worktree f',
      'git branch -d x', 'git branch -D x', 'git branch -M x', 'git branch --delete x',
      'git stash drop', 'git stash clear', 'git tag -d v1', 'git rm file', 'git rm -r --cached x',
      'git reflog expire', 'git gc', 'git prune', 'git filter-branch',
    ]) blocked(c)
  })
  it('מתיר קריאה ויצירת ענף', () => {
    for (const c of [
      'git status', 'git diff', 'git diff --staged', 'git log --oneline', 'git branch', 'git branch new-branch',
      'git checkout -b new-branch', 'git switch -c new-branch', 'git checkout main', 'git switch main',
      'git clean --dry-run', 'git clean -n', 'git restore --staged file', 'git reset', 'git reset --soft HEAD~1',
      'git stash', 'git stash pop', 'git tag v1', 'git add .', 'git fetch', 'git rev-parse HEAD',
    ]) allowed(c)
  })
})

describe('שרשור וציטוטים', () => {
  it('חוסם פקודה אסורה בכל מקום בשרשור', () => {
    for (const c of ['cd x && git push', 'echo hi; rm -rf x', 'ls | git push', 'git status\ngit commit -m x', 'a || npm publish']) blocked(c)
  })
  it('אינו חוסם טקסט בתוך מרכאות', () => {
    allowed('echo "git push"')
    allowed("echo 'rm -rf x'")
  })
  it('קלט ריק או לא חוקי אינו חוסם', () => {
    for (const c of ['', '   ', undefined, null, 42]) allowed(c)
  })
})

describe('הרצה כתהליך (stdin JSON)', () => {
  const payload = (tool_name, command) => JSON.stringify({ tool_name, tool_input: { command } })

  it('git push נכשל ב-Bash וב-PowerShell עם exit 2 והודעה', () => {
    for (const tool of ['Bash', 'PowerShell']) {
      const result = runHook(payload(tool, 'git push'))
      expect(result.status).toBe(2)
      expect(result.stderr).toContain('חסום')
    }
  })
  it('npm publish נכשל', () => {
    const result = runHook(payload('Bash', 'npm publish'))
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('publish')
  })
  it('git diff מצליח', () => {
    const result = runHook(payload('Bash', 'git diff'))
    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
  })
  it('קלט פגום או בלי command אינו חוסם', () => {
    expect(runHook('not json').status).toBe(0)
    expect(runHook('{}').status).toBe(0)
    expect(runHook(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'x' } })).status).toBe(0)
  })
})
