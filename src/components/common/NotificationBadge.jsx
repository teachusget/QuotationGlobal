export default function NotificationBadge({ count }) {
  return <span className="absolute -right-1.5 -top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-white">{count}</span>
}
