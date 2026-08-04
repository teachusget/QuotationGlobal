import { ShieldX } from 'lucide-react'
import { Card, EmptyState } from '../components/ui'
export default function ForbiddenPage(){return <section className="grid min-h-[65vh] place-items-center"><Card className="w-full max-w-xl"><EmptyState icon={ShieldX} title="Access denied" description="Your account does not have permission to access this module. Contact an administrator if you believe this is unexpected."/></Card></section>}
