import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, showDetails: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Körset ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-overlay">
          <div className="error-boundary-card">
            <span className="material-symbols-outlined error-boundary-icon">warning</span>
            <h2 className="error-boundry-title">Что-то пошло не так</h2>
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
                  {this.state.showDetails ? 'Скрыть детали' : 'Показать детали'}
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
