import { useState, useEffect, useCallback } from 'react'
import API from '../utils/api'

const DEFAULTS = [
  { name:'Food',emoji:'🍔',color:'#F97316',isDefault:true },
  { name:'Coffee',emoji:'☕',color:'#92400E',isDefault:true },
  { name:'Transport',emoji:'🚗',color:'#3B82F6',isDefault:true },
  { name:'Shopping',emoji:'🛍️',color:'#EC4899',isDefault:true },
  { name:'Subscriptions',emoji:'📱',color:'#8B5CF6',isDefault:true },
  { name:'Entertainment',emoji:'🎬',color:'#10B981',isDefault:true },
  { name:'Health',emoji:'🏥',color:'#EF4444',isDefault:true },
  { name:'Fitness',emoji:'🏋️',color:'#F59E0B',isDefault:true },
  { name:'Education',emoji:'🎓',color:'#6366F1',isDefault:true },
  { name:'Bills',emoji:'💡',color:'#0EA5E9',isDefault:true },
  { name:'Travel',emoji:'✈️',color:'#14B8A6',isDefault:true },
  { name:'Gifts',emoji:'🎁',color:'#E879F9',isDefault:true },
  { name:'Other',emoji:'📦',color:'#6B7280',isDefault:true },
]

export default function useCategories() {
  const [categories, setCategories] = useState(DEFAULTS)

  const refresh = useCallback(async () => {
    try {
      const { data } = await API.get('/categories')
      setCategories(data)
    } catch {
      // keep defaults
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const addCategory = async (name, emoji) => {
    const { data } = await API.post('/categories', { name: name.trim(), emoji })
    setCategories(prev => [...prev, data])
    return data
  }

  const removeCategory = async (id) => {
    await API.delete('/categories/' + id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  // helper: look up emoji/color by name (supports custom cats)
  const getCatMeta = (name) => categories.find(c => c.name === name) || { emoji: '📦', color: '#6B7280' }

  return { categories, addCategory, removeCategory, refresh, getCatMeta }
}
