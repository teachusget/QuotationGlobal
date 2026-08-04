import { LayoutTemplate } from 'lucide-react'
import { Card, EmptyState, PageHeader } from '../components/ui'

export default function HomePage() { return <section aria-labelledby="page-title"><PageHeader eyebrow="Workspace" title="Dashboard" description="A clear overview of your Quotation Global workspace."/><Card className="mt-6"><EmptyState icon={LayoutTemplate} title="Dashboard modules" description="Your operational summaries and activity insights will appear here."/></Card></section> }
