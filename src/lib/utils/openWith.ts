/**
 * מיפוי מקומי בין סיומות נפוצות לתוכנה שבדרך כלל פותחת אותן.
 * אין זיהוי של תוכנת ברירת המחדל במחשב; סיומת לא מוכרת מחזירה undefined.
 */
const APPS: Record<string, string> = {}

function add(app: string, extensions: string[]): void {
  for (const ext of extensions) APPS[ext] = app
}

add('Microsoft Photos', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'heic', 'tif', 'tiff'])
add('Microsoft Edge', ['svg', 'htm', 'html'])
add('Adobe Acrobat Reader', ['pdf'])
add('Microsoft Word', ['doc', 'docx', 'rtf'])
add('Microsoft Excel', ['xls', 'xlsx', 'csv'])
add('Microsoft PowerPoint', ['ppt', 'pptx'])
add('Notepad', ['txt', 'log', 'ini'])
add('Visual Studio Code', [
  'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'cs', 'py', 'java', 'css', 'xml', 'yml', 'yaml',
  'sql', 'sh', 'ps1', 'cpp', 'c', 'h',
])
add('סייר הקבצים של Windows', ['zip'])
add('7-Zip', ['rar', '7z', 'tar', 'gz'])
add('Windows Media Player', ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma'])
add('VLC media player', ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm'])

export function getOpenWithApp(extension: string): string | undefined {
  return APPS[extension.toLowerCase()]
}
