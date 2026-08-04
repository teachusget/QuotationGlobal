import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-lg border bg-white p-6 text-center shadow-subtle">
          <h1 className="text-base font-bold text-slate-900">Page could not load</h1>
          <p className="mt-2 text-xs leading-5 text-slate-500">The application encountered an unexpected error.</p>
          <button onClick={() => window.location.reload()} className="mt-5 h-9 rounded-md bg-primary px-4 text-xs font-semibold text-white hover:bg-blue-700">Reload page</button>
        </section>
      </main>
    }
    return this.props.children
  }
}
