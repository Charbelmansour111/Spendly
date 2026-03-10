import { useState } from 'react'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Subscriptions', 'Entertainment', 'Other']

function ReceiptScanner({ onScanComplete }) {
  const [scanning, setScanning] = useState(false)
  const [preview, setPreview] = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [error, setError] = useState(null)

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
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

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: file.type, data: base64 }
              },
              {
                type: 'text',
                text: `Analyze this receipt image and extract the following information. Respond ONLY with a JSON object, no markdown, no explanation:
{
  "amount": "total amount as a number string e.g. 25.50",
  "description": "merchant name or short description of purchase",
  "category": "one of: Food, Transport, Shopping, Subscriptions, Entertainment, Other",
  "date": "date in YYYY-MM-DD format, use today if not found"
}
If you cannot read the receipt clearly, still return your best guess.`
              }
            ]
          }]
        })
      })

      const data = await response.json()
      const text = data.content[0].text.trim()
      const parsed = JSON.parse(text)
      setExtracted({
        amount: parsed.amount || '',
        description: parsed.description || 'Scanned receipt',
        category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
        date: parsed.date || new Date().toISOString().split('T')[0]
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
        <label className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
          <span className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">📸 Upload Receipt Photo</span>
          <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
        </label>
      ) : (
        <div className="space-y-3">
          {/* Preview with delete button */}
          <div className="relative">
            <img src={preview} alt="Receipt" className="w-full max-h-48 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
            <button
              onClick={handleReset}
              className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition shadow-md"
            >✕</button>
          </div>

          {/* Scanning state */}
          {scanning && (
            <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-3">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">AI is reading your receipt...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
              <button onClick={handleReset} className="text-red-500 text-xs underline mt-1">Try another photo</button>
            </div>
          )}

          {/* Extracted data confirmation */}
          {extracted && !scanning && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
              <p className="text-green-700 dark:text-green-400 text-sm font-semibold">✅ Receipt scanned! Review and confirm:</p>
              
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Amount</label>
                  <input
                    type="number"
                    value={extracted.amount}
                    onChange={e => setExtracted({ ...extracted, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Description</label>
                  <input
                    type="text"
                    value={extracted.description}
                    onChange={e => setExtracted({ ...extracted, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Category</label>
                  <select
                    value={extracted.category}
                    onChange={e => setExtracted({ ...extracted, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Date</label>
                  <input
                    type="date"
                    value={extracted.date}
                    onChange={e => setExtracted({ ...extracted, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition"
                >
                  ✅ Confirm & Fill Form
                </button>
                <button
                  onClick={handleReset}
                  className="bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 px-4 py-2 rounded-xl text-sm hover:bg-gray-300 transition"
                >
                  🔄 Rescan
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ReceiptScanner