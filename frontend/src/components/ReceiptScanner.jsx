import { useState, useRef } from 'react'
import API from '../utils/api'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Subscriptions', 'Entertainment', 'Other']

function ReceiptScanner({ onScanComplete }) {
  const [scanning, setScanning] = useState(false)
  const [preview, setPreview] = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const processImage = async (file) => {
    if (!file) return
    setError(null)
    setExtracted(null)
    const imageUrl = URL.createObjectURL(file)
    setPreview(imageUrl)
    setScanning(true)

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const token = localStorage.getItem('token')
      const res = await API.post('/receipts/scan',
        { imageBase64: base64, mimeType: file.type },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setExtracted({
        amount: res.data.amount || '',
        description: res.data.description || 'Scanned receipt',
        category: CATEGORIES.includes(res.data.category) ? res.data.category : 'Other',
        date: res.data.date || new Date().toISOString().split('T')[0]
      })
    } catch {
      setError('Could not read receipt. Please try a clearer photo.')
    }
    setScanning(false)
  }

  const handleReset = () => {
    setPreview(null)
    setExtracted(null)
    setError(null)
    setScanning(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleConfirm = () => {
    if (extracted) {
      onScanComplete(extracted)
      handleReset()
    }
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        📷 Scan Receipt (optional)
      </label>

      {!preview ? (
        <div className="flex gap-2">
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
            <span className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">📁 Upload Photo</span>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={e => processImage(e.target.files[0])} className="hidden" />
          </label>
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition">
            <span className="text-purple-600 dark:text-purple-400 font-medium text-sm">📸 Take Photo</span>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={e => processImage(e.target.files[0])} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <img src={preview} alt="Receipt" className="w-full max-h-48 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
            <button onClick={handleReset} className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition shadow-md">✕</button>
          </div>

          {scanning && (
            <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-3">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">AI is reading your receipt...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
              <button onClick={handleReset} className="text-red-500 text-xs underline mt-1">Try another photo</button>
            </div>
          )}

          {extracted && !scanning && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
              <p className="text-green-700 dark:text-green-400 text-sm font-semibold">✅ Receipt scanned! Review and confirm:</p>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Amount</label>
                  <input type="number" value={extracted.amount} onChange={e => setExtracted({ ...extracted, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Description</label>
                  <input type="text" value={extracted.description} onChange={e => setExtracted({ ...extracted, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Category</label>
                  <select value={extracted.category} onChange={e => setExtracted({ ...extracted, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Date</label>
                  <input type="date" value={extracted.date} onChange={e => setExtracted({ ...extracted, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleConfirm} className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition">✅ Confirm & Fill Form</button>
                <button onClick={handleReset} className="bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 px-4 py-2 rounded-xl text-sm hover:bg-gray-300 transition">🔄 Rescan</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ReceiptScanner