import { useState, useEffect, useRef } from 'react'
import { X, Eye, Send, Loader2, CheckCircle2, XCircle, Mail, Users, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { apiClient } from '../../lib/api'

interface Event {
  id: number
  title: string
  date: string
  time?: string
  location?: string
  description?: string
  posterUrl?: string | null
}

interface Member {
  email: string
  name?: string
}

interface BroadcastStatus {
  status: 'idle' | 'running' | 'cancelled' | 'completed' | 'not_started'
  sent: number
  failed: number
  total: number
}

interface EmailBroadcastModalProps {
  event: Event | null
  isOpen: boolean
  onClose: () => void
}

export function EmailBroadcastModal({ event, isOpen, onClose }: EmailBroadcastModalProps) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [memberSearch, setMemberSearch] = useState('')
  const [showMemberList, setShowMemberList] = useState(false)
  const [sendingToMembers, setSendingToMembers] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null)
  const [broadcasting, setBroadcasting] = useState(false)
  const [progress, setProgress] = useState<BroadcastStatus>({
    status: 'idle',
    sent: 0,
    failed: 0,
    total: 0,
  })
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && event) {
      setShowPreview(false)
      setTestStatus('idle')
      setSendResult(null)
      setSelectedMembers(new Set())
      setMemberSearch('')
      setShowMemberList(false)
      setProgress({ status: 'idle', sent: 0, failed: 0, total: 0 })
      fetchMembers()
    }
  }, [isOpen, event])

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  const fetchMembers = async () => {
    setLoadingMembers(true)
    try {
      const res = await apiClient.get<Member[]>('/events/members/list')
      if (res.success && res.data) {
        setMembers(res.data as Member[])
      }
    } catch (err) {
      console.error('Failed to fetch members:', err)
    } finally {
      setLoadingMembers(false)
    }
  }

  const loadPreview = async () => {
    if (!event) return
    setLoadingPreview(true)
    try {
      const res = await apiClient.get<{ html: string }>(`/events/${event.id}/preview-email`)
      if (res.success && res.data?.html) {
        setPreviewHtml(res.data.html)
        setShowPreview(true)
      }
    } catch (err) {
      console.error('Failed to load preview:', err)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleSendTest = async () => {
    if (!event || !testEmail) return
    setSendingTest(true)
    setTestStatus('idle')
    try {
      const res = await apiClient.post(`/events/${event.id}/send-test-email`, { testEmail })
      if (res.success) {
        setTestStatus('success')
        setTimeout(() => setTestStatus('idle'), 3000)
      } else {
        setTestStatus('error')
        setTimeout(() => setTestStatus('idle'), 3000)
      }
    } catch {
      setTestStatus('error')
      setTimeout(() => setTestStatus('idle'), 3000)
    } finally {
      setSendingTest(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.email)))
    }
  }

  const handleToggleMember = (email: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(email)) {
      newSelected.delete(email)
    } else {
      newSelected.add(email)
    }
    setSelectedMembers(newSelected)
  }

  const handleSendToSelected = async () => {
    if (!event || selectedMembers.size === 0) return
    setSendingToMembers(true)
    setSendResult(null)
    try {
      const res = await apiClient.post<{ sent: number; failed: number }>(
        `/events/${event.id}/send-to-members`,
        { emails: Array.from(selectedMembers) }
      )
      if (res.success && res.data) {
        setSendResult(res.data as { sent: number; failed: number })
        setSelectedMembers(new Set())
      }
    } catch (err) {
      console.error('Failed to send to members:', err)
    } finally {
      setSendingToMembers(false)
    }
  }

  const handleBroadcast = async () => {
    if (!event) return
    setBroadcasting(true)
    setProgress(prev => ({ ...prev, status: 'running' }))

    try {
      await apiClient.post(`/events/${event.id}/broadcast`)

      pollingRef.current = setInterval(async () => {
        try {
          const res = await apiClient.get<BroadcastStatus>(`/events/${event.id}/broadcast-status`)
          if (res.success && res.data) {
            setProgress(res.data)

            if (res.data.status === 'completed' || res.data.status === 'cancelled') {
              if (pollingRef.current) {
                clearInterval(pollingRef.current)
              }
              setBroadcasting(false)
            }
          }
        } catch (err) {
          console.error('Polling error:', err)
        }
      }, 2000)
    } catch (err) {
      console.error('Broadcast start error:', err)
      setBroadcasting(false)
      setProgress(prev => ({ ...prev, status: 'idle' }))
    }
  }

  const handleCancel = async () => {
    if (!event) return
    try {
      await apiClient.post(`/events/${event.id}/broadcast-cancel`)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
      setBroadcasting(false)
      setProgress(prev => ({ ...prev, status: 'cancelled' }))
    } catch (err) {
      console.error('Cancel error:', err)
    }
  }

  if (!isOpen || !event) return null

  const filteredMembers = members.filter(m => {
    const search = memberSearch.toLowerCase()
    return (
      m.email.toLowerCase().includes(search) ||
      (m.name && m.name.toLowerCase().includes(search))
    )
  })

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (showPreview && previewHtml) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-8">
        <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Email Preview</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <iframe
            srcDoc={previewHtml}
            className="flex-1 border-0 w-full"
            title="Email Preview"
            sandbox="allow-same-origin"
          />
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isRunning = progress.status === 'running'
  const isCompleted = progress.status === 'completed'
  const isCancelled = progress.status === 'cancelled'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Send Event Email</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="relative h-44 group overflow-hidden bg-gray-50 border-b border-gray-100">
              {event.posterUrl ? (
                <img
                  src={event.posterUrl}
                  alt="Event poster"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.classList.add('bg-gradient-to-br', 'from-teal-50', 'to-blue-50');
                      if (!parent.querySelector('.fallback-icon')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'fallback-icon absolute inset-0 flex items-center justify-center opacity-40';
                        fallback.innerHTML = `
                          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1" fill="none" class="text-teal-600">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                        `;
                        parent.appendChild(fallback);
                      }
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-slate-100">
                   <Users className="w-8 h-8 text-gray-300" />
                   <span className="text-xs text-gray-400 font-medium">No poster attached</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-2 truncate">{event.title}</h4>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center">📅</div>
                   <span>{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center">🕒</div>
                   <span>{event.time || 'TBD'}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                   <div className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center">📍</div>
                   <span className="truncate">{event.location || 'TBD'}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={loadPreview}
            disabled={loadingPreview}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-gray-600"
          >
            {loadingPreview ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
            {loadingPreview ? 'Loading Preview...' : 'Preview Email'}
          </button>

          <div className="border-t border-gray-100 pt-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Send test email to:</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
              <button
                onClick={handleSendTest}
                disabled={!testEmail || sendingTest}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {sendingTest ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : testStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : testStatus === 'error' ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            </div>
            {testStatus === 'success' && (
              <p className="text-xs text-green-600 mt-1">Test email sent successfully!</p>
            )}
            {testStatus === 'error' && (
              <p className="text-xs text-red-600 mt-1">Failed to send test email</p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Select Members</label>
                {selectedMembers.size > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {selectedMembers.size} selected
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowMemberList(!showMemberList)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {showMemberList ? (
                  <><ChevronUp className="w-4 h-4" /> Hide</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Show</>
                )}
              </button>
            </div>

            {showMemberList && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="Search members..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={handleSelectAll}
                      disabled={filteredMembers.length === 0}
                      className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      {selectedMembers.size === filteredMembers.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-xs text-gray-500">
                      {filteredMembers.length} members
                    </span>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No members found
                    </div>
                  ) : (
                    filteredMembers.map(member => (
                      <label
                        key={member.email}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(member.email)}
                          onChange={() => handleToggleMember(member.email)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                {selectedMembers.size > 0 && (
                  <div className="p-3 bg-blue-50 border-t border-blue-100">
                    <button
                      onClick={handleSendToSelected}
                      disabled={sendingToMembers}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {sendingToMembers ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                      ) : (
                        <><Send className="w-4 h-4" /> Send to {selectedMembers.size} Selected Member{selectedMembers.size > 1 ? 's' : ''}</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {sendResult && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-700">Emails sent!</p>
                  <p className="text-xs text-green-600">
                    {sendResult.sent} sent successfully
                    {sendResult.failed > 0 && `, ${sendResult.failed} failed`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-5">
            {isRunning && (
              <div className="mb-4 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">Broadcasting to all members...</span>
                  <button
                    onClick={handleCancel}
                    className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mb-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: progress.total > 0 ? `${((progress.sent + progress.failed) / progress.total) * 100}%` : '0%',
                    }}
                  />
                </div>
                <p className="text-xs text-blue-600 text-center">
                  {progress.sent + progress.failed} / {progress.total} sent
                  {progress.failed > 0 && ` (${progress.failed} failed)`}
                </p>
              </div>
            )}

            {isCompleted && (
              <div className="mb-4 p-4 bg-green-50 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700">Broadcast Complete!</span>
                </div>
                <p className="text-sm text-green-600 text-center">
                  {progress.sent} emails sent successfully
                  {progress.failed > 0 && `, ${progress.failed} failed`}
                </p>
              </div>
            )}

            {isCancelled && (
              <div className="mb-4 p-4 bg-yellow-50 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-700">Broadcast Cancelled</span>
                </div>
                <p className="text-sm text-yellow-600 text-center">
                  {progress.sent} emails were sent before cancellation
                </p>
              </div>
            )}

            <button
              onClick={handleBroadcast}
              disabled={broadcasting}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {broadcasting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Broadcasting... {progress.sent + progress.failed} / {progress.total}
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Broadcast to All Members
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
