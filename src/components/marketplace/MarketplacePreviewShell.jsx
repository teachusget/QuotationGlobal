import { Facebook, Linkedin, Menu, Youtube } from 'lucide-react'
import BrandLogo from '../common/BrandLogo'
import MarketplaceRenderer from './MarketplaceRenderer'

const socialIcons = { linkedin: Linkedin, facebook: Facebook, youtube: Youtube, x: ({ className }) => <span className={className}>X</span> }

export default function MarketplacePreviewShell({ document, media, catalog }) {
  const { header = {}, footer = {}, theme = {} } = document
  const style = { '--market-primary': theme.primary, '--market-secondary': theme.secondary, '--market-canvas': theme.canvas, '--market-surface': theme.surface, '--market-text': theme.text, '--market-muted': theme.muted, fontFamily: theme.font === 'System' ? 'system-ui, sans-serif' : 'Inter, sans-serif', color: theme.text, backgroundColor: theme.canvas }
  return <div style={style} className="min-h-[700px] overflow-hidden">
    <header className="flex min-h-16 items-center gap-4 border-b px-4" style={{ backgroundColor: theme.surface }}>
      <BrandLogo branding={header} media={media}/>
      <nav className="ml-auto hidden items-center gap-5 text-xs font-semibold md:flex">{(header.nav || []).map((item) => <button key={item.id} type="button" className="hover:text-primary">{item.label}</button>)}{header.cta?.label && <button type="button" className="rounded-full px-4 py-2 text-white" style={{ backgroundColor: theme.primary }}>{header.cta.label}</button>}</nav>
      <button type="button" aria-label="Preview mobile navigation" className="ml-auto grid h-10 w-10 place-items-center rounded-lg border md:hidden"><Menu className="h-5 w-5"/></button>
    </header>
    <main className="px-4 py-5"><MarketplaceRenderer document={document} media={media} catalog={catalog} preview/></main>
    <footer className="border-t px-5 py-6" style={{ backgroundColor: theme.surface }}><div className="grid gap-6 md:grid-cols-[1.4fr_3fr_1.2fr]"><div><BrandLogo branding={header} media={media}/><p className="mt-3 text-xs leading-5" style={{ color: theme.muted }}>{footer.description}</p><div className="mt-3 flex gap-2">{(footer.socials || []).map((social) => { const Icon = socialIcons[social.kind] || socialIcons.x; return <span key={social.id} className="grid h-8 w-8 place-items-center rounded-full border"><Icon className="h-4 w-4"/></span> })}</div></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{(footer.columns || []).map((column) => <section key={column.id}><h3 className="text-xs font-semibold">{column.title}</h3>{(column.links || []).map((link) => <p key={link.id} className="mt-2 text-xs" style={{ color: theme.muted }}>{link.label}</p>)}</section>)}</div>{footer.newsletter?.visible !== false && <section className="rounded-lg border p-4"><h3 className="text-sm font-semibold">{footer.newsletter?.title}</h3><p className="mt-1 text-xs" style={{ color: theme.muted }}>{footer.newsletter?.description}</p><div className="mt-3 h-9 rounded-md border"/><div className="mt-2 grid h-9 place-items-center rounded-md text-xs font-semibold text-white" style={{ backgroundColor: theme.primary }}>{footer.newsletter?.button_label || 'Subscribe'}</div></section>}</div><div className="mt-5 border-t pt-4 text-right text-xs" style={{ color: theme.muted }}>{footer.copyright}</div></footer>
  </div>
}
