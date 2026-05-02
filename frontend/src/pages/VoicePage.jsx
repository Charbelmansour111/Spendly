import { useEffect, useState } from 'react'
import VoiceAssistant from '../components/VoiceAssistant'

export default function VoicePage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      window.location.href = '/login'
    } else {
      setReady(true)
    }
  }, [])

  if (!ready) return null

  return (
    <div className="min-h-screen bg-gray-950">
      <VoiceAssistant onClose={() => { window.location.href = '/dashboard' }} />
    </div>
  )
}
