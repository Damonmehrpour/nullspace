import { Component, Suspense, useState, type ReactNode } from 'react'
import { writeJSON } from '../core/safeStorage'
import { ErrorFallback, type FailureReason } from './ErrorFallback'
import { Loading3D } from './Loading3D'
import { ChunkLoadError, createWorldLoader, ENTER3D_FLAG, type WorldModule } from './worldLoader'

class Boundary extends Component<{ onError: (r: FailureReason) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error instanceof ChunkLoadError ? 'load' : 'crash')
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

type Props = { importer?: () => Promise<WorldModule>; reload?: () => void }

/** Loads the 3D chunk on demand with recoverable failure states. View Portfolio is always offered. */
export function WorldHost({ importer, reload = () => window.location.reload() }: Props) {
  const [loader, setLoader] = useState(() => createWorldLoader(importer))
  const [failure, setFailure] = useState<FailureReason | null>(null)

  function retry() {
    setFailure(null)
    setLoader((l) => createWorldLoader(importer, l.attempt + 1))
  }

  function reloadRetry() {
    writeJSON(ENTER3D_FLAG, true, 'session')
    reload()
  }

  if (failure) {
    const exhausted = failure === 'load' && loader.attempt >= 1
    return <ErrorFallback reason={failure} onRetry={retry} onReloadRetry={exhausted ? reloadRetry : undefined} />
  }

  const World = loader.Component
  return (
    <Boundary key={loader.attempt} onError={setFailure}>
      <Suspense fallback={<Loading3D />}>
        <World onFailure={setFailure} />
      </Suspense>
    </Boundary>
  )
}
