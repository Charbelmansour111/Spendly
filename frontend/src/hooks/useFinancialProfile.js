import { useState, useEffect } from 'react'
import API from '../utils/api'

export const useFinancialProfile = () => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get('/profile/financial')
      .then(r => setProfile(r.data?.exists ? r.data : null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  const updateProfile = async (data) => {
    const res = await API.post('/profile/financial', data)
    setProfile(res.data)
    return res.data
  }

  const updateContext = async (text) => {
    await API.put('/profile/financial/context', { context: text })
    setProfile(p => p ? { ...p, monthly_context: text } : p)
  }

  const clearContext = async () => {
    await API.put('/profile/financial/context', { context: '' })
    setProfile(p => p ? { ...p, monthly_context: null } : p)
  }

  return { profile, loading, updateProfile, updateContext, clearContext }
}
