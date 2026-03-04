import { useEffect, useState } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true')

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('darkMode', dark)
  }, [dark])

  const toggle = () => setDark(d => !d)
  return [dark, toggle]
}
