import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { BrowserFileSystemAdapter } from './lib/BrowserFileSystemAdapter'
import { ExplorerProvider } from './state/ExplorerContext'
import { SearchProvider } from './state/SearchContext'
import './styles/tokens.css'
import './styles/app.css'

// נקודת ההחלפה היחידה של שכבת הגישה לקבצים. הכול רץ בדפדפן, ללא שרת.
const adapter = new BrowserFileSystemAdapter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ExplorerProvider adapter={adapter}>
      <SearchProvider>
        <App />
      </SearchProvider>
    </ExplorerProvider>
  </StrictMode>,
)
