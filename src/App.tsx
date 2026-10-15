import { DetailsPane } from './components/DetailsPane'
import { FileList } from './components/FileList'
import { PlacesView } from './components/PlacesView'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { TitleBar } from './components/TitleBar'
import { Toolbar } from './components/Toolbar'
import { UnsupportedBrowser } from './components/UnsupportedBrowser'
import { useExplorer } from './state/ExplorerContext'

export default function App() {
  const { state, location, actions, supported } = useExplorer()

  if (!supported) return <UnsupportedBrowser />

  return (
    <div className="app">
      <TitleBar />
      <Toolbar />
      {state.notice && (
        <div className="notice" role="alert">
          <span>{state.notice}</span>
          <button type="button" className="icon-btn" aria-label="סגירה" onClick={actions.dismissNotice}>✕</button>
        </div>
      )}
      <div className="body">
        <Sidebar />
        <main className="content">
          {location.type === 'folder' ? <FileList /> : <PlacesView mode={location.type} />}
        </main>
        <DetailsPane />
      </div>
      <StatusBar />
    </div>
  )
}
