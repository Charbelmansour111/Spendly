import { useEffect } from 'react'

export function useHideNav() {
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [])
}
