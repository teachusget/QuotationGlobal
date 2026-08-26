import { Boxes, ChevronLeft, ChevronRight, Headphones, Rocket, ShieldCheck, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export default function FeaturedAdsCarousel({ ads = [], services = [], preview = false }) {
  const [active, setActive] = useState(0)
  const serviceMap = useMemo(() => new Map(services.map((service) => [Number(service.id), service])), [services])
  const slides = ads.map((ad) => ({ ...ad, service: serviceMap.get(Number(ad.service_id)) })).filter((ad) => ad.service)
  useEffect(() => { if (active >= slides.length) setActive(0) }, [active, slides.length])
  useEffect(() => {
    if (preview || slides.length < 2) return undefined
    const seconds = Math.min(120, Math.max(2, Number(slides[active]?.duration_seconds) || 6))
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % slides.length), seconds * 1000)
    return () => window.clearTimeout(timer)
  }, [active, preview, slides])
  if (!slides.length) return <div className="grid min-h-64 place-items-center rounded-3xl border border-white/20 bg-white/10 p-6 text-center text-white/75"><div><Boxes className="mx-auto h-9 w-9"/><p className="mt-3 text-sm font-semibold">Featured software ads</p><p className="mt-1 text-xs">Select software from Marketplace Builder.</p></div></div>
  const ad = slides[active]; const service = ad.service
  const preferredImage = service.images?.find((item) => item?.image_data || item?.image_url)
  const image = preferredImage?.image_data || preferredImage?.image_url || service.image_url
  const change = (direction) => setActive((index) => (index + direction + slides.length) % slides.length)
  return <article className="featured-ads-carousel group relative mx-auto min-h-72 max-w-md overflow-hidden rounded-3xl border border-white/25 bg-white text-slate-900 shadow-floating transition hover:-translate-y-0.5 hover:shadow-overlay">
    <Link to={preview ? '#' : `/marketplace/services/${service.id}`} onClick={(event) => preview && event.preventDefault()} aria-label={`View ${service.name}`} className="absolute inset-0 z-10 rounded-3xl focus:outline-none focus:ring-4 focus:ring-white/70"/>
    <div className="featured-ad-main relative bg-white/95 p-6"><span className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">Featured Ad</span><div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-white p-2 shadow-[0_8px_25px_rgba(37,99,235,.16)]">{image ? <img src={image} alt={service.name} className="block h-full w-full object-contain object-center"/> : <Boxes className="h-9 w-9 text-primary"/>}</div><h2 className="mt-5 line-clamp-2 text-lg font-extrabold leading-6 group-hover:text-primary">{service.name}</h2><p className="mt-1.5 truncate text-[12px] font-medium text-slate-500">by {service.vendor?.company_name || service.vendor?.name || service.vendor || 'Verified vendor'}</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-primary">{service.category?.name || 'Technology'}</span><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-indigo-600">{service.service_type}</span></div></div>
    <div className="grid grid-cols-4 border-y border-slate-100 bg-white px-2 py-4">{[[Rocket, 'Fast Delivery', 'On time'], [ShieldCheck, 'Trusted Experts', 'Verified team'], [Star, '5.0 Rating', 'Top reviews'], [Headphones, '24/7 Support', 'Always here']].map(([Icon, title, detail]) => <div key={title} className="border-r px-2 text-center last:border-r-0"><Icon className="mx-auto h-5 w-5 text-indigo-600"/><b className="mt-2 block text-[9px] text-slate-800">{title}</b><small className="mt-0.5 block text-[8px] text-slate-400">{detail}</small></div>)}</div>
    <div className="relative bg-white px-5 py-4">{slides.length > 1 && <div className="relative z-20 flex items-center justify-between gap-4"><div className="flex flex-1 gap-1.5">{slides.map((slide, index) => <button key={`${slide.service_id}-${index}`} type="button" onClick={() => setActive(index)} aria-label={`Show ad ${index + 1}`} className={`h-1.5 flex-1 rounded-full ${index === active ? 'bg-indigo-600' : 'bg-slate-200'}`}/>)}</div><div className="flex items-center gap-1.5"><button type="button" onClick={() => change(-1)} className="grid h-9 w-9 place-items-center rounded-full border bg-white text-indigo-600" aria-label="Previous ad"><ChevronLeft className="h-4 w-4"/></button><button type="button" onClick={() => change(1)} className="grid h-9 w-9 place-items-center rounded-full border bg-white text-indigo-600" aria-label="Next ad"><ChevronRight className="h-4 w-4"/></button></div></div>}</div>
  </article>
}
