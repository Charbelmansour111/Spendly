import { useState, useEffect } from 'react'
import axios from 'axios'

const BASE_URL = 'https://spendly-backend-et20.onrender.com/api'

const STATUS_BADGE = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
}

function Badge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function Modal({ app, adminKey, onClose, onStatusChange }) {
  const [tab, setTab] = useState('info')
  const [rejectReason, setRejectReason] = useState('')
  const [approveNotes, setApproveNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [fullApp, setFullApp] = useState(null)
  const [fetchingDocs, setFetchingDocs] = useState(true)

  useEffect(() => {
    axios.get(`${BASE_URL}/advisor/admin/application/${app.id}`, {
      headers: { 'x-admin-key': adminKey }
    })
      .then(r => setFullApp(r.data))
      .catch(() => setFullApp(app))
      .finally(() => setFetchingDocs(false))
  }, [app.id, adminKey]) // eslint-disable-line

  async function approve() {
    if (!window.confirm(`Approve application from ${app.full_name}?`)) return
    setLoading(true)
    try {
      await axios.post(`${BASE_URL}/advisor/admin/approve/${app.id}`, { notes: approveNotes }, {
        headers: { 'x-admin-key': adminKey }
      })
      onStatusChange(app.id, 'approved')
      onClose()
    } catch (e) {
      alert(e.response?.data?.message || 'Approve failed')
    } finally {
      setLoading(false)
    }
  }

  async function reject() {
    if (!rejectReason.trim()) { alert('Please enter a rejection reason'); return }
    if (!window.confirm(`Reject application from ${app.full_name}?`)) return
    setLoading(true)
    try {
      await axios.post(`${BASE_URL}/advisor/admin/reject/${app.id}`, { reason: rejectReason }, {
        headers: { 'x-admin-key': adminKey }
      })
      onStatusChange(app.id, 'rejected')
      onClose()
    } catch (e) {
      alert(e.response?.data?.message || 'Reject failed')
    } finally {
      setLoading(false)
    }
  }

  const data = fullApp || app

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl mt-8 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{app.full_name}</h2>
            <p className="text-sm text-gray-400">{app.email} · Application #{app.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge status={app.status} />
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 border-b border-gray-100 dark:border-gray-700">
          {['info', 'documents', 'actions'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                tab === t ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {/* Info Tab */}
          {tab === 'info' && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {[
                ['Full Name', data.full_name],
                ['Email', data.email],
                ['Phone', data.phone],
                ['Country', data.country],
                ['City', data.city],
                ['Languages', data.languages],
                ['License Type', data.license_type],
                ['License #', data.license_number],
                ['Institution', data.institution],
                ['Years Experience', data.years_experience],
                ['Specialty', data.specialty],
                ['Consultation Fee', data.consultation_fee ? `${data.consultation_fee} ${data.fee_currency}` : 'N/A'],
                ['Free Consultation', data.offers_free_consultation ? 'Yes' : 'No'],
                ['Submitted', data.submitted_at ? new Date(data.submitted_at).toLocaleString() : '—'],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-gray-50 dark:border-gray-800 pb-2">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{value || '—'}</p>
                </div>
              ))}
              <div className="col-span-2 border-b border-gray-50 dark:border-gray-800 pb-3">
                <p className="text-xs text-gray-400 mb-0.5">Bio</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{data.bio || '—'}</p>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {tab === 'documents' && (
            <div>
              {fetchingDocs ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'National ID — Front', field: 'id_scan_front' },
                    { label: 'National ID — Back', field: 'id_scan_back' },
                    { label: 'License / Degree', field: 'license_scan' },
                    { label: 'Selfie with ID', field: 'selfie_with_id' },
                  ].map(doc => (
                    <div key={doc.field} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{doc.label}</p>
                      </div>
                      <div className="p-3">
                        {data[doc.field] ? (
                          data[doc.field].startsWith('data:image') ? (
                            <img
                              src={data[doc.field]}
                              alt={doc.label}
                              className="w-full h-48 object-contain bg-gray-50 dark:bg-gray-800 rounded-lg"
                            />
                          ) : data[doc.field].startsWith('data:application/pdf') ? (
                            <iframe
                              src={data[doc.field]}
                              title={doc.label}
                              className="w-full h-48 rounded-lg border-0"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <p className="text-xs text-gray-400">Preview not available</p>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-400">Not uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions Tab */}
          {tab === 'actions' && (
            <div className="space-y-6">
              {app.status !== 'approved' && (
                <div className="border border-green-200 dark:border-green-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3">Approve Application</h3>
                  <textarea
                    value={approveNotes}
                    onChange={e => setApproveNotes(e.target.value)}
                    placeholder="Optional notes to include in approval email…"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none min-h-[80px] mb-3"
                  />
                  <button
                    onClick={approve}
                    disabled={loading}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-60"
                  >
                    {loading ? 'Processing…' : 'Approve & Notify Applicant'}
                  </button>
                </div>
              )}

              {app.status !== 'rejected' && (
                <div className="border border-red-200 dark:border-red-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Reject Application</h3>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Required: explain the reason for rejection…"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none min-h-[80px] mb-3"
                  />
                  <button
                    onClick={reject}
                    disabled={loading}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-60"
                  >
                    {loading ? 'Processing…' : 'Reject & Notify Applicant'}
                  </button>
                </div>
              )}

              {app.status === 'approved' && (
                <div className="text-center py-6 text-sm text-gray-400">This application is already approved.</div>
              )}
              {app.status === 'rejected' && (
                <div className="text-center py-6 text-sm text-gray-400">This application has been rejected.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminAdvisors() {
  const [adminKey, setAdminKey] = useState('')
  const [inputKey, setInputKey] = useState('')
  const [keyError, setKeyError] = useState('')
  const [authed, setAuthed] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selectedApp, setSelectedApp] = useState(null)

  async function verifyKey() {
    if (!inputKey.trim()) { setKeyError('Please enter the admin key'); return }
    setVerifying(true)
    setKeyError('')
    try {
      const res = await axios.get(`${BASE_URL}/advisor/admin/applications`, {
        headers: { 'x-admin-key': inputKey }
      })
      setAdminKey(inputKey)
      setApplications(res.data)
      setAuthed(true)
    } catch (e) {
      setKeyError(e.response?.status === 403 ? 'Invalid admin key' : 'Connection error. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  async function refreshApps() {
    setLoading(true)
    try {
      const res = await axios.get(`${BASE_URL}/advisor/admin/applications`, {
        headers: { 'x-admin-key': adminKey }
      })
      setApplications(res.data)
    } catch {}
    finally { setLoading(false) }
  }

  function handleStatusChange(id, newStatus) {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
  }

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold">Spendly Admin</h1>
              <p className="text-gray-400 text-xs">Advisor Applications</p>
            </div>
          </div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Admin Key</label>
          <input
            type="password"
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verifyKey()}
            placeholder="Enter admin secret key"
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
          />
          {keyError && <p className="text-red-400 text-xs mb-3">{keyError}</p>}
          <button
            onClick={verifyKey}
            disabled={verifying}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-60"
          >
            {verifying ? 'Verifying…' : 'Enter Admin Panel'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700/60 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <span className="font-bold text-white">Spendly Admin — Advisor Applications</span>
        </div>
        <button
          onClick={refreshApps}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1.5 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Refresh
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
                filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {f} <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${filter === f ? 'bg-white/20' : 'bg-gray-700'}`}>{counts[f]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>No applications in this category.</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/60">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">License</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Specialty</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Submitted</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(app => (
                  <tr
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="hover:bg-gray-800/50 cursor-pointer transition"
                  >
                    <td className="px-6 py-4 text-sm text-gray-400">#{app.id}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-white">{app.full_name}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 hidden md:table-cell">{app.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 hidden lg:table-cell">{app.license_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 hidden lg:table-cell max-w-[180px] truncate">{app.specialty}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 hidden sm:table-cell">
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={app.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selectedApp && (
        <Modal
          app={selectedApp}
          adminKey={adminKey}
          onClose={() => setSelectedApp(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
