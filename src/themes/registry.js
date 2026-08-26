const loaders = {
  'neon-nexus': () => import('./neon-nexus.css'),
  'orbit-glass-2026': () => import('./orbit-glass-2026.css'),
}

export function loadMarketplaceTheme(preset = 'neon-nexus') {
  return (loaders[preset] || loaders['neon-nexus'])()
}

export const supportedMarketplaceThemes = Object.keys(loaders)
