import { Component } from 'react'
import * as Sentry from '@sentry/react'
import { AlertTriangleIcon } from './icons/index.js'
import { isChunkLoadError, canAutoReloadNow, markAutoReload } from '../utils/chunkRecovery.js'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, showDetails: false, reloading: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Körset ErrorBoundary:', error, errorInfo)
    // Send to Sentry (production only, DSN must be configured in main.jsx)
    Sentry.withScope((scope) => {
      scope.setExtra('errorInfo', errorInfo)
      scope.setExtra('location', window.location.href)
      Sentry.captureException(error)
    })

    // Stale chunk after deploy → auto-reload once per window; loop-protected by a timestamp.
    if (isChunkLoadError(error) && canAutoReloadNow(window.sessionStorage, Date.now())) {
      markAutoReload(window.sessionStorage, Date.now())
      this.setState({ reloading: true })
      window.location.reload()
    }
  }

  render() {
    if (this.state.reloading) {
      return (
        <div className="error-boundary-overlay">
          <div className="error-boundary-card error-boundary-card--reloading">
            <span className="error-boundary-spinner" aria-hidden="true" />
            <p className="error-boundary-reloading-text">
              {this.props.t?.('common.errorReloading') || 'Обновляем приложение…'}
            </p>
          </div>
        </div>
      )
    }

    if (this.state.hasError) {
      return (
        <div className="error-boundary-overlay">
          <div className="error-boundary-card">
            <AlertTriangleIcon className="error-boundary-icon" size={48} color="#F87171" />
            <h2 className="error-boundry-title">
              {this.props.t?.('common.errorTitle') || 'Что-то пошло не так'}
            </h2>
            <p className="error-boundary-desc">
              Произошла непредвиденная ошибка. Попробуйте перезагрузить или вернуться на главную.
            </p>
            <div className="error-boundary-actions">
              <button className="error-boundary-btn" onClick={() => window.location.reload()}>
                Перезагрузить
              </button>
              <button
                className="error-boundary-btn error-boundary-btn-secondary"
                onClick={() => {
                  window.location.href = '/'
                }}
              >
                На главную
              </button>
            </div>
            {this.state.error && (
              <div className="error-boundary-details">
                <button
                  className="error-boundary-details-toggle"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                >
                  {this.state.showDetails
                    ? this.props.t?.('common.errorHide') || 'Скрыть детали'
                    : this.props.t?.('common.errorShow') || 'Показать детали'}
                </button>
                {this.state.showDetails && (
                  <pre className="error-boundary-details-text">{String(this.state.error)}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
