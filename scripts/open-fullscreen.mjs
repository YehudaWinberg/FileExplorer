// פותח את הדפדפן במסך מלא (כמו F11) ברגע ששרת ה-Vite מוכן.
// דף web לא יכול להיכנס למסך מלא לבד בלי לחיצה, ולכן הדפדפן מופעל עם --start-fullscreen.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:5173'

const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]
const candidates = [
  'Google\\Chrome\\Application\\chrome.exe',
  'Microsoft\\Edge\\Application\\msedge.exe',
]
const browser = roots
  .filter(Boolean)
  .flatMap((root) => candidates.map((c) => `${root}\\${c}`))
  .find(existsSync)

if (!browser) {
  console.error('לא נמצא Chrome או Edge; פתח ידנית:', url)
  process.exit(1)
}

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(url)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 300))
    }
  }
}

await waitForServer()
spawn(browser, ['--start-fullscreen', url], { detached: true, stdio: 'ignore' }).unref()
