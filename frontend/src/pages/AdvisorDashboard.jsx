import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const inputClass =
  'w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

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

function StarRating({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#f59e0b' : 'none'} className="shrink-0">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ))}
    </div>
  )
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 min-w-0">{message}</span>
      <button onClick={onClose} className="hover:opacity-70">✕</button>
    </div>
  )
}

export default function AdvisorDashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Edit form state
  const [editBio, setEditBio] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editLanguages, setEditLanguages] = useState('')
  const [editSpecialty, setEditSpecialty] = useState('')
  const [editFee, setEditFee] = useState('')
  const [editOffersFree, setEditOffersFree] = useState(false)
  const [editIsPublic, setEditIsPublic] = useState(false)

  useEffect(() => {
    API.get('/advisor/my-profile')
      .then(r => setProfile(r.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  function startEdit() {
    setEditBio(profile.bio || '')
    setEditPhone(profile.phone || '')
    setEditCity(profile.city || '')
    setEditLanguages(profile.languages || '')
    setEditSpecialty(profile.specialty || '')
    setEditFee(profile.consultation_fee || '')
    setEditOffersFree(profile.offers_free_consultation || false)
    setEditIsPublic(profile.is_public || false)
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      await API.put('/advisor/my-profile', {
        bio: editBio,
        phone: editPhone,
        city: editCity,
        languages: editLanguages,
        specialty: editSpecialty,
        consultation_fee: editFee ? parseFloat(editFee) : 0,
        offers_free_consultation: editOffersFree,
        is_public: editIsPublic,
      })
      const updated = { ...profile, bio: editBio, phone: editPhone, city: editCity, languages: editLanguages, specialty: editSpecialty, consultation_fee: editFee, offers_free_consultation: editOffersFree, is_public: editIsPublic }
      setProfile(updated)
      setEditing(false)
      setToast({ message: 'Profile updated!', type: 'success' })
    } catch {
      setToast({ message: 'Failed to save changes', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!profile) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No advisor application found.</p>
          <a href="/advisor/apply" className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition">
            Apply as Advisor →
          </a>
        </div>
      </Layout>
    )
  }

  // Pending
  if (profile.status === 'pending') {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
              ⏳
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Application Under Review</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-4">
              Our team is reviewing your application. This typically takes <strong className="text-gray-700 dark:text-gray-200">1–3 business days</strong>.
            </p>
            {profile.submitted_at && (
              <p className="text-xs text-gray-400 mb-6">
                Submitted: {new Date(profile.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-sm text-indigo-700 dark:text-indigo-300">
              Questions? Email us at <a href="mailto:support@spendly.app" className="underline">support@spendly.app</a>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Rejected
  if (profile.status === 'rejected') {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
              ❌
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Application Not Approved</h2>
            {profile.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Reason</p>
                <p className="text-sm text-red-700 dark:text-red-300">{profile.rejection_reason}</p>
              </div>
            )}
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              You are welcome to address the concerns and reapply.
            </p>
            <a
              href="/advisor/apply"
              className="inline-block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition"
            >
              Reapply →
            </a>
          </div>
        </div>
      </Layout>
    )
  }

  // Approved dashboard
  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Stats bar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{profile.full_name}</h1>
              <p className="text-sm text-indigo-600 dark:text-indigo-400">{profile.specialty}</p>
            </div>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
              Verified Advisor
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <StarRating rating={parseFloat(profile.rating) || 0} />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{parseFloat(profile.rating || 0).toFixed(1)}</p>
              <p className="text-xs text-gray-400">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{profile.total_reviews || 0}</p>
              <p className="text-xs text-gray-400">Reviews</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{profile.clients_helped || 0}</p>
              <p className="text-xs text-gray-400">Clients Helped</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {[
            { key: 'profile', label: 'My Profile' },
            { key: 'preview', label: 'Directory Preview' },
            { key: 'reviews', label: 'Reviews' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1 — My Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6">
            {!editing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Profile Details</h2>
                  <button
                    onClick={startEdit}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition"
                  >
                    Edit
                  </button>
                </div>
                <ProfileRow label="License Type" value={profile.license_type} />
                <ProfileRow label="Institution" value={profile.institution} />
                <ProfileRow label="Specialty" value={profile.specialty} />
                <ProfileRow label="Experience" value={profile.years_experience ? `${profile.years_experience} years` : '—'} />
                <ProfileRow label="Languages" value={profile.languages || '—'} />
                <ProfileRow label="Phone" value={profile.phone || '—'} />
                <ProfileRow label="Location" value={profile.city && profile.country ? `${profile.city}, ${profile.country}` : '—'} />
                <ProfileRow label="Fee" value={
                  profile.offers_free_consultation
                    ? 'Free consultation'
                    : profile.consultation_fee
                    ? `${profile.consultation_fee} ${profile.fee_currency}`
                    : '—'
                } />
                <ProfileRow label="Public Listing" value={profile.is_public ? 'Visible in directory' : 'Not listed publicly'} />
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <p className="text-xs text-gray-400 mb-2">Bio</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{profile.bio || '—'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Edit Profile</h2>

                <div>
                  <label className={labelClass}>Bio</label>
                  <textarea
                    className={inputClass + ' min-h-[100px] resize-none'}
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input type="text" className={inputClass} value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input type="text" className={inputClass} value={editCity} onChange={e => setEditCity(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Languages</label>
                  <input type="text" className={inputClass} value={editLanguages} onChange={e => setEditLanguages(e.target.value)} />
                </div>

                <div>
                  <label className={labelClass}>Specialty</label>
                  <select className={inputClass} value={editSpecialty} onChange={e => setEditSpecialty(e.target.value)}>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Consultation Fee ({profile.fee_currency})</label>
                  <input type="number" min="0" className={inputClass} value={editFee} onChange={e => setEditFee(e.target.value)} />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editOffersFree} onChange={e => setEditOffersFree(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Offer free initial consultation</span>
                </label>

                <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Appear in public directory</p>
                    <p className="text-xs text-gray-400">Allow users to find and contact you</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsPublic(!editIsPublic)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${editIsPublic ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editIsPublic ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2 — Directory Preview */}
        {activeTab === 'preview' && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">This is how your card appears in the public advisor directory.</p>
            <AdvisorCard advisor={profile} preview />
            {!profile.is_public && (
              <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm text-yellow-700 dark:text-yellow-300">
                Your profile is not currently listed in the public directory. Enable "Appear in public directory" in the Profile tab to be discoverable.
              </div>
            )}
          </div>
        )}

        {/* Tab 3 — Reviews */}
        {activeTab === 'reviews' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">No reviews yet</h3>
            <p className="text-sm text-gray-400">
              Reviews from clients will appear here once users start leaving feedback on your profile.
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex gap-4 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <p className="text-xs text-gray-400 w-32 shrink-0 pt-0.5">{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  )
}

function AdvisorCard({ advisor, preview }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 ${preview ? 'max-w-sm' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-lg shrink-0">
          {advisor.full_name?.charAt(0) || '?'}
        </div>
        <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
          {advisor.license_type}
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white">{advisor.full_name}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{advisor.institution}</p>
      <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3">{advisor.specialty}</p>

      {advisor.languages && (
        <p className="text-xs text-gray-400 mb-3">{advisor.languages}</p>
      )}

      <div className="flex items-center justify-between mb-4">
        {parseFloat(advisor.rating) > 0 ? (
          <div className="flex items-center gap-1.5">
            <StarRating rating={parseFloat(advisor.rating)} size={13} />
            <span className="text-xs text-gray-500">({advisor.total_reviews})</span>
          </div>
        ) : (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">New</span>
        )}
        {advisor.offers_free_consultation ? (
          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium">Free consultation</span>
        ) : advisor.consultation_fee > 0 ? (
          <span className="text-xs text-gray-600 dark:text-gray-300">{advisor.consultation_fee} {advisor.fee_currency}</span>
        ) : null}
      </div>

      {advisor.years_experience > 0 && (
        <p className="text-xs text-gray-400 mb-3">{advisor.years_experience} years experience</p>
      )}

      <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition">
        Contact
      </button>
    </div>
  )
}
