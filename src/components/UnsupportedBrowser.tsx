import { EmptyState } from './EmptyState'

export function UnsupportedBrowser() {
  return (
    <div className="unsupported">
      <EmptyState
        tone="error"
        title="הדפדפן שלך אינו תומך בגישה לתיקיות"
        detail="סייר הקבצים משתמש ב-File System Access API, הזמין ב-Google Chrome וב-Microsoft Edge (גרסאות עדכניות), בכתובת localhost או HTTPS. יש לפתוח את האפליקציה באחד מהדפדפנים האלה."
      />
    </div>
  )
}
