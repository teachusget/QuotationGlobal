import { Component } from 'react'
import { Button, Card } from '../ui'

export default class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <Card className="w-full max-w-md p-7 text-center"><h1 className="text-xl font-semibold text-slate-900">Page could not load</h1><p className="mt-2 text-sm leading-6 text-slate-500">The application encountered an unexpected error. Your data has not been changed.</p><Button onClick={() => window.location.reload()} className="mt-6">Reload page</Button></Card>
      </main>
    }
    return this.props.children
  }
}
