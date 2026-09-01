import { useEffect, useState } from 'react'

// Both columns are the same three hues stepped for their own surface, and both
// pass the categorical checks (lightness band, chroma floor, CVD separation,
// normal-vision floor) against this app's --bg in that mode. Three slots is the
// cap that clears all-pairs separation, which the donut needs since every slice
// sits next to every other.
const LIGHT = {
  series: ['#2a78d6', '#eb6834', '#1baf7a'],
  surface: '#ffffff',
  grid: 'rgba(8, 6, 13, 0.09)',
  text: '#6b6375',
  textStrong: '#08060d',
}

const DARK = {
  series: ['#3987e5', '#d95926', '#199e70'],
  surface: '#16171d',
  grid: 'rgba(243, 244, 246, 0.12)',
  text: '#9ca3af',
  textStrong: '#f3f4f6',
}

// Recharts needs literal colors rather than CSS custom properties, so the
// palette is selected in JS from the same media query index.css themes on.
export default function useChartPalette() {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = e => setIsDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isDark ? DARK : LIGHT
}
