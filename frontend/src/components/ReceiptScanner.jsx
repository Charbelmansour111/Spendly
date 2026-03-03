import { useState } from 'react'
import Tesseract from 'tesseract.js'

function ReceiptScanner({ onScanComplete }) {
  const [scanning, setScanning] = useState(false)
  const [preview, setPreview] = useState(null)

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const imageUrl = URL.createObjectURL(file)
    setPreview(imageUrl)
    setScanning(true)

    try {
      const result = await Tesseract.recognize(file, 'eng')
      const text = result.data.text

      const amountMatch = text.match(/\$?\d+\.\d{2}/)
      const invoiceMatch = text.match(/#?\s*(invoice|receipt|order|no|number|ref)[:\s#]*(\w+\d+|\d+)/i)
        || text.match(/(?:^|\s)#(\d+)/im)

      const amount = amountMatch ? amountMatch[0].replace('$', '') : ''
      const invoiceNumber = invoiceMatch ? invoiceMatch[2] || invoiceMatch[1] : ''
      const description = invoiceNumber ? `Receipt #${invoiceNumber}` : 'Scanned receipt'

      onScanComplete({ amount, description })
    } catch {
      console.log('Error scanning receipt')
    }

    setScanning(false)
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        📷 Scan Receipt (optional)
      </label>
      <label className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition">
        <span className="text-indigo-600 font-medium text-sm">
          {scanning ? '🔍 Scanning...' : '📸 Upload Receipt Photo'}
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </label>
      {preview && (
        <div className="mt-3">
          <img src={preview} alt="Receipt" className="w-full max-h-40 object-contain rounded-xl border border-gray-200" />
        </div>
      )}
    </div>
  )
}

export default ReceiptScanner