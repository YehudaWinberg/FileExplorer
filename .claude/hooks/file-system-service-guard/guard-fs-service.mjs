// לוגיקה טהורה: האם נכתבה גישה ישירה ל-File System API בקובץ שתחת תיקיית components.

const FS_API = [
  'showDirectoryPicker',
  'showOpenFilePicker',
  'showSaveFilePicker',
  'getDirectoryHandle',
  'getFileHandle',
  'createWritable',
  'FileSystemHandle',
  'FileSystemFileHandle',
  'FileSystemDirectoryHandle',
  'FileSystemWritableFileStream',
]
const FS_API_RE = new RegExp(`\\b(${FS_API.join('|')})\\b`, 'g')

export function isUnderComponents(filePath) {
  if (typeof filePath !== 'string') return false
  return /(^|\/)src\/components\//i.test(filePath.replace(/\\/g, '/'))
}

// הטקסט שנכתב: content ב-Write, new_string ב-Edit, ו-edits[] ב-MultiEdit.
export function writtenText(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return ''
  const parts = [toolInput.content, toolInput.new_string]
  if (Array.isArray(toolInput.edits)) for (const e of toolInput.edits) parts.push(e?.new_string)
  return parts.filter((p) => typeof p === 'string').join('\n')
}

// הערות לא נחשבות גישה ל-API.
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

export function findFsApi(text) {
  return [...new Set(stripComments(text).match(FS_API_RE) ?? [])]
}

export function checkToolCall(input) {
  if (!input || !['Edit', 'Write', 'MultiEdit'].includes(input.tool_name)) return { violation: false }
  const filePath = input.tool_input?.file_path
  if (!isUnderComponents(filePath)) return { violation: false }
  const found = findFsApi(writtenText(input.tool_input))
  if (found.length === 0) return { violation: false }
  return {
    violation: true,
    reason:
      `אסור לגשת ל-File System API ישירות מתוך components (${filePath}; נמצא: ${found.join(', ')}). ` +
      'חובה לעבור דרך src/lib: שם כבר קיים שירות (BrowserFileSystemAdapter, דרך הממשק FileSystemAdapter ב-src/lib/fileSystem.ts) שפונה ל-API. ' +
      'הקומפוננט צריך לקבל את הגישה דרך ה-state (useExplorer / ExplorerContext). תקן את הקובץ כך שלא יפנה ל-API ישירות.',
  }
}
