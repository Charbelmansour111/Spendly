import { useEffect } from 'react'
import { startTour } from './TourBanner'

export default function Onboarding({ onDone }) {
  useEffect(() => {
    startTour(true)                                      // step -1 = welcome inside TourBanner
    window.dispatchEvent(new Event('spendly_tour_update'))
    onDone()                                             // mark onboarded so this doesn't re-mount
  }, [])

  return null
}
