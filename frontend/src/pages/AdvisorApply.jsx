import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../utils/api'

const COUNTRIES = [
  'Lebanon', 'Saudi Arabia', 'UAE', 'Jordan', 'Egypt',
  'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Other',
]

const LICENSE_TYPES = [
  'CFA', 'CFP', 'CPA', 'Banking License', 'Investment License',
  'Insurance License', 'MBA Finance', 'Bachelor in Finance/Economics', 'Other',
]

const SPECIALTIES = [
  'Personal Finance & Budgeting',
  'Retirement Planning',
  'Investment Management',
  'Debt Management',
  'Tax Planning',
  'Real Estate Finance',
  'Business Finance',
  'Insurance & Risk',
  'General Financial Advice',
]

const inputClass =
  'w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

function FieldError({ msg }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-500">{msg}</p>
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AdvisorApply() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  // Step 1 — Personal Info
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [languages, setLanguages] = useState('')
  const [bio, setBio] = useState('')

  // Step 2 — Professional Info
  const [licenseType, setLicenseType] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [institution, setInstitution] = useState('')
  const [yearsExp, setYearsExp] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [consultationFee, setConsultationFee] = useState('')
  const [feeCurrency, setFeeCurrency] = useState('USD')
  const [offersFree, setOffersFree] = useState(false)

  // Step 3 — Documents
  const [idFront, setIdFront] = useState(null)
  const [idFrontPreview, setIdFrontPreview] = useState(null)
  const [idBack, setIdBack] = useState(null)
  const [idBackPreview, setIdBackPreview] = useState(null)
  const [licenseScan, setLicenseScan] = useState(null)
  const [licenseScanPreview, setLicenseScanPreview] = useState(null)
  const [selfie, setSelfie] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)

  async function handleFileChange(e, setter, previewSetter) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB')
      return
    }
    const b64 = await fileToBase64(file)
    setter(b64)
    if (file.type.startsWith('image/')) {
      previewSetter({ type: 'image', src: b64, name: file.name })
    } else {
      previewSetter({ type: 'pdf', name: file.name })
    }
  }

  function validateStep1() {
    const e = {}
    if (!fullName.trim()) e.fullName = 'Full name is required'
    if (!phone.trim()) e.phone = 'Phone number is required'
    if (!country) e.country = 'Please select a country'
    if (!city.trim()) e.city = 'City is required'
    if (!bio.trim()) e.bio = 'Bio is required'
    else if (bio.trim().length < 100) e.bio = `Bio must be at least 100 characters (${bio.trim().length}/100)`
    return e
  }

  function validateStep2() {
    const e = {}
    if (!licenseType) e.licenseType = 'Please select a license type'
    if (!licenseNumber.trim()) e.licenseNumber = 'License or degree number is required'
    if (!institution.trim()) e.institution = 'Institution name is required'
    if (!specialty) e.specialty = 'Please select a specialty'
    return e
  }

  function validateStep3() {
    const e = {}
    if (!idFront) e.idFront = 'National ID front is required'
    if (!idBack) e.idBack = 'National ID back is required'
    if (!licenseScan) e.licenseScan = 'License or degree certificate is required'
    return e
  }

  function handleNext() {
    let errs = {}
    if (step === 1) errs = validateStep1()
    if (step === 2) errs = validateStep2()
    if (step === 3) errs = validateStep3()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await API.post('/advisor/apply', {
        full_name: fullName,
        phone,
        country,
        city,
        bio,
        languages,
        license_type: licenseType,
        license_number: licenseNumber,
        institution,
        years_experience: yearsExp ? parseInt(yearsExp) : 0,
        specialty,
        consultation_fee: consultationFee ? parseFloat(consultationFee) : 0,
        fee_currency: feeCurrency,
        offers_free_consultation: offersFree,
        id_scan_front: idFront,
        id_scan_back: idBack,
        license_scan: licenseScan,
        selfie_with_id: selfie,
      })
      setStep(5)
    } catch (e) {
      const msg = e.response?.data?.message || 'Submission failed. Please try again.'
      setErrors({ submit: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const progressPct = Math.min(((step - 1) / 4) * 100, 100)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <a href="/dashboard" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Apply as Financial Advisor</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Join the Spendly Verified Advisor Network</p>
          </div>
        </div>

        {/* Progress bar */}
        {step <= 4 && (
          <div className="mb-8">
            <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              <span className={step >= 1 ? 'text-indigo-600 dark:text-indigo-400' : ''}>Personal Info</span>
              <span className={step >= 2 ? 'text-indigo-600 dark:text-indigo-400' : ''}>Professional</span>
              <span className={step >= 3 ? 'text-indigo-600 dark:text-indigo-400' : ''}>Documents</span>
              <span className={step >= 4 ? 'text-indigo-600 dark:text-indigo-400' : ''}>Review</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">Step {step} of 4</p>
          </div>
        )}

        {/* ── Step 1 — Personal Info ── */}
        {step === 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h2>

            <div>
              <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={inputClass}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full legal name"
              />
              <FieldError msg={errors.fullName} />
            </div>

            <div>
              <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={inputClass}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+961 XX XXX XXX"
              />
              <FieldError msg={errors.phone} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Country <span className="text-red-500">*</span></label>
                <select className={inputClass} value={country} onChange={e => setCountry(e.target.value)}>
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <FieldError msg={errors.country} />
              </div>
              <div>
                <label className={labelClass}>City <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={inputClass}
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Your city"
                />
                <FieldError msg={errors.city} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Languages</label>
              <input
                type="text"
                className={inputClass}
                value={languages}
                onChange={e => setLanguages(e.target.value)}
                placeholder="e.g. Arabic, English, French"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass + ' mb-0'}>Bio <span className="text-red-500">*</span></label>
                <span className={`text-xs ${bio.length < 100 ? 'text-red-400' : 'text-green-500'}`}>{bio.length}/100 min</span>
              </div>
              <textarea
                className={inputClass + ' min-h-[120px] resize-none'}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell potential clients about your background, approach, and how you can help them…"
              />
              <FieldError msg={errors.bio} />
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition"
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 2 — Professional Info ── */}
        {step === 2 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Professional Information</h2>

            <div>
              <label className={labelClass}>License / Credential Type <span className="text-red-500">*</span></label>
              <select className={inputClass} value={licenseType} onChange={e => setLicenseType(e.target.value)}>
                <option value="">Select license type</option>
                {LICENSE_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <FieldError msg={errors.licenseType} />
            </div>

            <div>
              <label className={labelClass}>License / Degree Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={inputClass}
                value={licenseNumber}
                onChange={e => setLicenseNumber(e.target.value)}
                placeholder="e.g. CFA-123456 or Degree certificate number"
              />
              <FieldError msg={errors.licenseNumber} />
            </div>

            <div>
              <label className={labelClass}>Institution <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={inputClass}
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                placeholder="University, bank, or issuing body"
              />
              <FieldError msg={errors.institution} />
            </div>

            <div>
              <label className={labelClass}>Years of Experience</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={yearsExp}
                onChange={e => setYearsExp(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <label className={labelClass}>Specialty <span className="text-red-500">*</span></label>
              <select className={inputClass} value={specialty} onChange={e => setSpecialty(e.target.value)}>
                <option value="">Select specialty</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <FieldError msg={errors.specialty} />
            </div>

            <div>
              <label className={labelClass}>Consultation Fee</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  className={inputClass + ' flex-1'}
                  value={consultationFee}
                  onChange={e => setConsultationFee(e.target.value)}
                  placeholder="0"
                />
                <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {['USD', 'LBP'].map(cur => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setFeeCurrency(cur)}
                      className={`px-4 py-3 text-sm font-medium transition ${
                        feeCurrency === cur
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={offersFree}
                onChange={e => setOffersFree(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">I offer a free initial consultation</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => { setErrors({}); setStep(1) }}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 — Documents ── */}
        {step === 3 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Document Upload</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">Max 5MB per file. Accepted: images and PDFs.</p>

            {[
              { label: 'National ID — Front Side', required: true, value: idFront, preview: idFrontPreview, errKey: 'idFront', setter: setIdFront, previewSetter: setIdFrontPreview },
              { label: 'National ID — Back Side', required: true, value: idBack, preview: idBackPreview, errKey: 'idBack', setter: setIdBack, previewSetter: setIdBackPreview },
              { label: 'License or Degree Certificate', required: true, value: licenseScan, preview: licenseScanPreview, errKey: 'licenseScan', setter: setLicenseScan, previewSetter: setLicenseScanPreview },
              { label: 'Selfie Holding Your ID', required: false, value: selfie, preview: selfiePreview, errKey: 'selfie', setter: setSelfie, previewSetter: setSelfiePreview },
            ].map((doc) => (
              <div key={doc.label}>
                <label className={labelClass}>
                  {doc.label} {doc.required && <span className="text-red-500">*</span>}
                  {doc.errKey === 'selfie' && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      — We require this to verify your identity and prevent fraud
                    </span>
                  )}
                </label>
                <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition ${
                  doc.value
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10'
                }`}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={e => handleFileChange(e, doc.setter, doc.previewSetter)}
                  />
                  {doc.preview ? (
                    doc.preview.type === 'image' ? (
                      <img src={doc.preview.src} alt={doc.label} className="h-28 w-auto object-contain rounded-lg" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-indigo-500"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{doc.preview.name}</p>
                        <p className="text-xs text-gray-400">Click to replace</p>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Click to upload</p>
                      <p className="text-xs text-gray-400">Image or PDF, max 5MB</p>
                    </div>
                  )}
                </label>
                <FieldError msg={errors[doc.errKey]} />
              </div>
            ))}

            <div className="flex gap-3">
              <button
                onClick={() => { setErrors({}); setStep(2) }}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4 — Review & Submit ── */}
        {step === 4 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Your Application</h2>

            <div className="space-y-4">
              <SummarySection title="Personal Info">
                <SummaryRow label="Full Name" value={fullName} />
                <SummaryRow label="Phone" value={phone} />
                <SummaryRow label="Location" value={`${city}, ${country}`} />
                <SummaryRow label="Languages" value={languages || '—'} />
                <SummaryRow label="Bio" value={bio} />
              </SummarySection>

              <SummarySection title="Professional Info">
                <SummaryRow label="License Type" value={licenseType} />
                <SummaryRow label="License/Degree #" value={licenseNumber} />
                <SummaryRow label="Institution" value={institution} />
                <SummaryRow label="Years Experience" value={yearsExp ? `${yearsExp} years` : 'Not specified'} />
                <SummaryRow label="Specialty" value={specialty} />
                <SummaryRow
                  label="Consultation Fee"
                  value={offersFree ? 'Free consultation offered' : consultationFee ? `${consultationFee} ${feeCurrency}` : 'Not specified'}
                />
              </SummarySection>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✓</span>
                  <div>
                    <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">4 documents uploaded</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400">ID front, ID back, license/degree, selfie</p>
                  </div>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                {errors.submit}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setErrors({}); setStep(3) }}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting…
                  </span>
                ) : 'Submit Application'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5 — Success ── */}
        {step === 5 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-green-500">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Application Submitted!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto mb-2">
              Thank you for applying to the Spendly Verified Advisor Network.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto mb-8">
              Our team will review your application within <strong className="text-gray-700 dark:text-gray-200">1–3 business days</strong>. You'll receive an email once a decision has been made.
            </p>
            <button
              onClick={() => navigate('/advisor/dashboard')}
              className="w-full max-w-xs mx-auto block py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition"
            >
              View Application Status →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SummarySection({ title, children }) {
  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2.5">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">{children}</div>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex px-4 py-3 gap-4">
      <p className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-200 flex-1 break-words">{value}</p>
    </div>
  )
}
