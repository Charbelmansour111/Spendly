import { useEffect } from 'react'

export function useHideNav() {
  useEffect(() => {
    const scrollY = window.scrollY

    // Lock body scroll + kill pull-to-refresh
    document.body.classList.add('modal-open')
    document.body.style.top = `-${scrollY}px`
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.documentElement.style.overscrollBehavior = 'none'

    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.top = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.documentElement.style.overscrollBehavior = ''
      window.scrollTo(0, scrollY)
    }
  }, [])
}
