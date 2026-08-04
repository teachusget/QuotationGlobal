import { useEffect, useRef } from 'react'

export default function useDialogAccessibility(open, onClose, disabled = false) {
  const panelRef = useRef(null)
  const closeRef = useRef(onClose)
  const disabledRef = useRef(disabled)
  closeRef.current = onClose
  disabledRef.current = disabled

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => panelRef.current?.querySelector('[autofocus],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])')?.focus())
    const keydown = (event) => {
      if (event.key === 'Escape' && !disabledRef.current) closeRef.current()
      if (event.key !== 'Tab') return
      const nodes = [...panelRef.current.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')]
      if (!nodes.length) return
      const first = nodes[0]; const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); previousFocus?.focus() }
  }, [open])

  return panelRef
}
