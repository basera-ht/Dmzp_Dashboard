import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Calendar, MapPin, Loader2, Edit2, Trash2, X,
  Eye, ClipboardList, ChevronRight, Check,
  Copy, GripVertical, Image as ImageIcon, ExternalLink,
  Ticket, Mail, MessageSquare,
} from 'lucide-react'
import { apiClient, getMediaUrl } from '../../lib/api'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CustomFormField {
  id: string
  label: string
  type: 'text' | 'select' | 'textarea'
  required: boolean
  options?: string[]
}

export interface Tour {
  id: number
  title: string
  slug: string
  description?: string
  coverImage?: string
  startDate: string
  endDate: string
  location: string
  capacity: number
  isPaid: boolean
  price: number
  upiId?: string
  upiQrImage?: string
  upiId2?: string
  upiQrImage2?: string
  whatsappGroupUrl?: string
  customFormFields?: CustomFormField[]
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface TourRegistration {
  id: number
  tourId: number
  fullName: string
  email: string
  phoneNumber: string
  customResponses?: Record<string, string>
  amountPaid: number
  upiTransactionId?: string
  paymentScreenshotUrl?: string
  dmzpFeesPaid?: boolean
  dmzpCardUrl?: string
  paymentStatus: 'pending_verification' | 'verified' | 'rejected'
  ticketCode?: string
  ticketSentAt?: string
  createdAt: string
}

interface RegStats {
  total: number
  verified: number
  pending: number
  rejected: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  published: 'bg-green-100 text-green-800 border border-green-200',
  archived: 'bg-gray-100 text-gray-700 border border-gray-200',
}

const PAYMENT_BADGES: Record<string, string> = {
  pending_verification: 'bg-amber-100 text-amber-800 border border-amber-200',
  verified: 'bg-green-100 text-green-800 border border-green-200',
  rejected: 'bg-red-100 text-red-800 border border-red-200',
}

const PAYMENT_LABELS: Record<string, string> = {
  pending_verification: 'Pending',
  verified: 'Approved',
  rejected: 'Rejected',
}

// ── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              i === current
                ? 'bg-teal-600 text-white shadow-sm'
                : i < current
                ? 'bg-teal-100 text-teal-800'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border border-current/20">
              {i < current ? <Check className="w-3 h-3" /> : i + 1}
            </span>
            <span>{label}</span>
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
        </div>
      ))}
    </div>
  )
}

// ── Custom Fields Builder ────────────────────────────────────────────────────

function CustomFieldsBuilder({
  fields,
  onChange,
}: {
  fields: CustomFormField[]
  onChange: (f: CustomFormField[]) => void
}) {
  const addField = () => {
    onChange([
      ...fields,
      { id: crypto.randomUUID(), label: '', type: 'text', required: false },
    ])
  }

  const updateField = (id: string, updates: Partial<CustomFormField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const removeField = (id: string) => onChange(fields.filter((f) => f.id !== id))

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div
          key={field.id}
          className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200"
        >
          <GripVertical className="w-4 h-4 text-gray-400 mt-2.5 shrink-0" />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
              placeholder="Question label (e.g. Dietary Preference)"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm col-span-1 sm:col-span-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <select
              value={field.type}
              onChange={(e) =>
                updateField(field.id, { type: e.target.value as CustomFormField['type'] })
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="text">Short Text</option>
              <option value="textarea">Paragraph</option>
              <option value="select">Dropdown Options</option>
            </select>

            {field.type === 'select' && (
              <input
                type="text"
                value={field.options?.join(', ') || ''}
                onChange={(e) =>
                  updateField(field.id, {
                    options: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Options separated by comma (e.g. S, M, L, XL)"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm col-span-1 sm:col-span-3 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            )}

            <div className="col-span-1 sm:col-span-3 flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                Required field
              </label>
              <button
                type="button"
                onClick={() => removeField(field.id)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addField}
        className="w-full py-2.5 border-2 border-dashed border-gray-200 hover:border-teal-400 rounded-xl text-xs font-semibold text-gray-600 hover:text-teal-700 transition-colors flex items-center justify-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Add Question to Registration Form
      </button>
    </div>
  )
}

// ── Tour Creation / Edit Wizard ──────────────────────────────────────────────

const STEPS = ['Place & Overview', 'Schedule', 'Pricing & UPI', 'Custom Fields']

interface WizardProps {
  editTour?: Tour | null
  onClose: () => void
  onSaved: () => void
}

function TourWizard({ editTour, onClose, onSaved }: WizardProps) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [error, setError] = useState('')

  // form state
  const [title, setTitle] = useState(editTour?.title || '')
  const [description, setDescription] = useState(editTour?.description || '')
  const [location, setLocation] = useState(editTour?.location || '')
  const [coverImage, setCoverImage] = useState(editTour?.coverImage || '')
  const [startDate, setStartDate] = useState(
    editTour?.startDate ? new Date(editTour.startDate).toISOString().split('T')[0] : ''
  )
  const [endDate, setEndDate] = useState(
    editTour?.endDate ? new Date(editTour.endDate).toISOString().split('T')[0] : ''
  )
  const [capacity, setCapacity] = useState(editTour?.capacity || 0)
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState(editTour?.whatsappGroupUrl || '')
  const [isPaid, setIsPaid] = useState(editTour?.isPaid || false)
  const [price, setPrice] = useState(editTour?.price || 0)
  const [upiId, setUpiId] = useState(editTour?.upiId || '')
  const [upiId2, setUpiId2] = useState(editTour?.upiId2 || '')
  const [customFields, setCustomFields] = useState<CustomFormField[]>(
    editTour?.customFormFields || []
  )

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('cover', file)
      const res = await apiClient.postForm<{ url: string }>('/tours/upload-cover', formData)
      if (res.success && res.data?.url) {
        setCoverImage(res.data.url)
      } else {
        setError(res.error || 'Failed to upload tour place photo')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo')
    } finally {
      setUploadingCover(false)
    }
  }

  const canNext = () => {
    if (step === 0) return Boolean(title.trim() && location.trim())
    if (step === 1) return Boolean(startDate && endDate && endDate >= startDate)
    if (step === 2 && isPaid) return price > 0 && Boolean(upiId.trim())
    return true
  }

  const handleSave = async (saveStatus: 'draft' | 'published') => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        title,
        description,
        location,
        coverImage: coverImage.trim() || undefined,
        startDate,
        endDate,
        capacity,
        whatsappGroupUrl: whatsappGroupUrl.trim() || undefined,
        isPaid,
        price: isPaid ? price : 0,
        upiId: isPaid ? upiId : null,
        upiId2: isPaid && upiId2.trim() ? upiId2 : null,
        customFormFields: customFields.filter((f) => f.label.trim()),
        status: saveStatus,
      }

      let res
      if (editTour) {
        res = await apiClient.put(`/tours/${editTour.id}`, payload)
      } else {
        res = await apiClient.post('/tours', payload)
      }
      if (!res.success) {
        setError(res.error || 'Failed to save tour')
        return
      }
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Failed to save tour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 relative border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editTour ? 'Edit Tour' : 'Create Tour'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add details, upload place photo, configure UPI, and customize registration
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <StepIndicator steps={STEPS} current={step} />
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Step 0: Place & Overview */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tour Place Picture / Banner
                </label>

                {coverImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 group mb-2 h-44 bg-gray-100">
                    <img
                      src={getMediaUrl(coverImage)}
                      alt="Tour Place Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label className="px-3 py-1.5 bg-white text-gray-800 rounded-lg text-xs font-semibold cursor-pointer shadow hover:bg-gray-50">
                        Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setCoverImage('')}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-teal-200 hover:border-teal-500 bg-teal-50/20 hover:bg-teal-50/40 rounded-2xl cursor-pointer transition-colors text-center mb-2">
                    {uploadingCover ? (
                      <div className="flex flex-col items-center gap-2 text-teal-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs font-semibold">Uploading place photo...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mb-2">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800">
                          Upload photo of your tour place
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          High-resolution JPG, PNG or WebP recommended
                        </p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingCover}
                      onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
                    />
                  </label>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Or paste image URL:</span>
                  <input
                    type="text"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://example.com/place.jpg"
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tour Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Kashmir Great Lakes Trek 2026"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Location *</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Sonamarg, Jammu & Kashmir"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the tour itinerary, inclusions, packing essentials, meeting points..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Step 1: Schedule */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Participant Capacity (0 = unlimited)
                </label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 0)}
                  min={0}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-green-600" /> WhatsApp Group Invite Link (Optional)
                </label>
                <input
                  type="url"
                  value={whatsappGroupUrl}
                  onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Members will automatically receive this WhatsApp group link in their confirmed tour ticket & confirmation email.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Pricing & UPI */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsPaid(false)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    !isPaid ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Free Tour
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isPaid ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Paid Tour (UPI Verification)
                </button>
              </div>

              {isPaid && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Price per participant (₹ INR) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                      <input
                        type="number"
                        value={price || ''}
                        onChange={(e) => setPrice(parseInt(e.target.value, 10) || 0)}
                        min={1}
                        placeholder="e.g. 2500"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      UPI ID for Payment Collection *
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. dmzp@okhdfcbank"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      A scan-to-pay QR code will be generated automatically for participants.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Secondary UPI ID <span className="text-xs text-gray-400 font-normal">(Optional — Backup)</span>
                    </label>
                    <input
                      type="text"
                      value={upiId2}
                      onChange={(e) => setUpiId2(e.target.value)}
                      placeholder="e.g. dmzp-backup@oksbi"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Add a backup UPI ID if the primary account hits transaction limits. Both will be shown to participants.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Custom Fields */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Ask specific questions to participants upon registration (e.g. Dietary preference, Emergency contact, T-shirt size).
              </p>
              <CustomFieldsBuilder fields={customFields} onChange={setCustomFields} />
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-b-2xl">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canNext()}
                className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                Next
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-300 disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('published')}
                  disabled={saving}
                  className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Publish Tour
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Registrations Panel (With Payment Screenshot Lightbox) ───────────────────

interface RegProps {
  tour: Tour
  onClose: () => void
}

function RegistrationPanel({ tour, onClose }: RegProps) {
  const [registrations, setRegistrations] = useState<TourRegistration[]>([])
  const [stats, setStats] = useState<RegStats>({ total: 0, verified: 0, pending: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [selectedProof, setSelectedProof] = useState<TourRegistration | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [regRes, statsRes] = await Promise.all([
        apiClient.get<any>(`/tours/${tour.id}/registrations?limit=200`),
        apiClient.get<RegStats>(`/tours/${tour.id}/registrations/stats`),
      ])
      if (regRes.success) setRegistrations(regRes.data?.data || [])
      if (statsRes.success && statsRes.data) setStats(statsRes.data)
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [tour.id])

  useEffect(() => {
    load()
  }, [load])

  const [actionError, setActionError] = useState('')
  const [ticketNotice, setTicketNotice] = useState('')
  const [sendingTicketId, setSendingTicketId] = useState<number | null>(null)

  const handleAction = async (regId: number, action: 'approve' | 'reject') => {
    setActionLoading(regId)
    setActionError('')
    setTicketNotice('')
    try {
      const res = await apiClient.patch(`/tours/registrations/${regId}/${action}`)
      if (res.success) {
        if (action === 'approve') {
          setTicketNotice('Registration approved and ticket email dispatched to participant!')
        }
        await load()
      } else {
        setActionError(res.error || `Failed to ${action} registration`)
      }
    } catch (err: any) {
      setActionError(err.message || `Failed to ${action} registration`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendTicket = async (regId: number) => {
    setSendingTicketId(regId)
    setActionError('')
    setTicketNotice('')
    try {
      const res = await apiClient.post<{ messageId?: string }>(`/tours/registrations/${regId}/send-ticket`)
      if (res.success) {
        setTicketNotice('Tour ticket email sent successfully!')
        await load()
      } else {
        setActionError(res.error || 'Failed to send ticket email')
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to send ticket email')
    } finally {
      setSendingTicketId(null)
    }
  }

  const sanitizeCSVCell = (val: unknown) => {
    let str = String(val ?? '')
    if (/^[=\+\-@\t\r]/.test(str)) {
      str = `'${str}`
    }
    return `"${str.replace(/"/g, '""')}"`
  }

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Amount', 'Payment Screenshot URL', 'DMZP Member', 'DMZP Card URL', 'Status', 'Date']
    const rows = registrations.map((r) => [
      r.fullName,
      r.email,
      r.phoneNumber,
      r.amountPaid,
      r.paymentScreenshotUrl ? getMediaUrl(r.paymentScreenshotUrl) : 'None',
      r.dmzpFeesPaid ? 'Yes' : 'No',
      r.dmzpCardUrl ? getMediaUrl(r.dmzpCardUrl) : 'None',
      PAYMENT_LABELS[r.paymentStatus],
      formatDate(r.createdAt),
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map(sanitizeCSVCell).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tour.slug}-registrations.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 border border-gray-100">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{tour.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Registrations & Payment Proof Verification
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-3 p-6 border-b border-gray-100">
            {[
              { label: 'Total Registrations', value: stats.total, color: 'text-gray-900' },
              { label: 'Approved', value: stats.verified, color: 'text-green-600' },
              { label: 'Pending Verification', value: stats.pending, color: 'text-amber-600' },
              { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          {actionError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
              <span>{actionError}</span>
              <button onClick={() => setActionError('')} className="text-red-500 hover:text-red-800 font-bold ml-2">×</button>
            </div>
          )}
          {ticketNotice && (
            <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> {ticketNotice}
              </span>
              <button onClick={() => setTicketNotice('')} className="text-emerald-700 hover:text-emerald-950 font-bold ml-2">×</button>
            </div>
          )}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing {registrations.length} participant(s)
            </span>
            <button
              onClick={exportCSV}
              disabled={registrations.length === 0}
              className="px-3.5 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                No participants registered for this tour yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 sticky top-0 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">
                      Payment Screenshot
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">
                      DMZP Member
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registrations.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{r.fullName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-semibold border border-teal-100">
                            {r.ticketCode || `TK-${r.id}`}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div>{r.email}</div>
                        <div className="font-mono text-gray-500 mt-0.5">{r.phoneNumber}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {r.amountPaid > 0 ? `₹${r.amountPaid.toLocaleString('en-IN')}` : 'Free'}
                      </td>
                      {/* Prominent Payment Screenshot Preview */}
                      <td className="px-4 py-3">
                        {r.paymentScreenshotUrl ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProof(r)}
                            className="group flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-teal-50 border border-gray-200 transition-colors text-left"
                            title="Click to inspect payment receipt"
                          >
                            <img
                              src={getMediaUrl(r.paymentScreenshotUrl)}
                              alt="Payment Screenshot"
                              className="w-11 h-11 object-cover rounded-lg border border-gray-100 shrink-0 shadow-xs"
                            />
                            <div>
                              <span className="text-xs font-bold text-teal-700 group-hover:underline flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> View Proof
                              </span>
                              <span className="text-[10px] text-gray-400 block">Click to enlarge</span>
                            </div>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs italic">
                            {r.amountPaid === 0 ? 'Free registration' : 'No screenshot'}
                          </span>
                        )}
                      </td>
                      {/* DMZP Membership Status */}
                      <td className="px-4 py-3">
                        {r.dmzpFeesPaid ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              Paid
                            </span>
                            {r.dmzpCardUrl && (
                              <button
                                type="button"
                                onClick={() => setSelectedProof(r)}
                                className="text-[10px] text-teal-600 hover:underline font-semibold flex items-center gap-0.5"
                              >
                                <Eye className="w-3 h-3" /> View Card
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Not Paid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            PAYMENT_BADGES[r.paymentStatus]
                          }`}
                        >
                          {PAYMENT_LABELS[r.paymentStatus]}
                        </span>
                        {r.ticketSentAt && (
                          <div className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Ticket Mailed
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.paymentStatus === 'pending_verification' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleAction(r.id, 'approve')}
                              disabled={actionLoading === r.id}
                              className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === r.id ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleAction(r.id, 'reject')}
                              disabled={actionLoading === r.id}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : r.paymentStatus === 'verified' ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {r.ticketCode ? (
                              <a
                                href={`/tour/${tour.slug}/ticket/${encodeURIComponent(r.ticketCode)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                title="View & print attendee's official ticket"
                              >
                                <Ticket className="w-3.5 h-3.5" /> Ticket
                              </a>
                            ) : null}
                            <button
                              onClick={() => handleSendTicket(r.id)}
                              disabled={sendingTicketId === r.id}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                              title={r.ticketSentAt ? `Sent at ${formatDate(r.ticketSentAt)} - Click to resend email` : 'Email ticket & WhatsApp link to member'}
                            >
                              {sendingTicketId === r.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              {r.ticketSentAt ? 'Resend' : 'Send'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── High-Resolution Payment Screenshot / DMZP Card Lightbox Modal ─────────────── */}
      {selectedProof && (selectedProof.paymentScreenshotUrl || selectedProof.dmzpCardUrl) && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {selectedProof.paymentScreenshotUrl ? 'Proof & Verification' : 'DMZP Membership Card'} — {selectedProof.fullName}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedProof.paymentScreenshotUrl && `Amount: ₹${selectedProof.amountPaid} • `}Registered: {formatDate(selectedProof.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedProof(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-gray-950 flex items-center justify-center max-h-[65vh] overflow-auto">
              <div className="flex flex-col items-center gap-4">
                {selectedProof.paymentScreenshotUrl && (
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Payment Screenshot</div>
                    <img
                      src={getMediaUrl(selectedProof.paymentScreenshotUrl)}
                      alt="Full Payment Screenshot"
                      className="max-h-[50vh] w-auto object-contain rounded-xl shadow-lg"
                    />
                  </div>
                )}
                {selectedProof.dmzpCardUrl && (
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">DMZP Membership Card</div>
                    <img
                      src={getMediaUrl(selectedProof.dmzpCardUrl)}
                      alt="DMZP Card"
                      className="max-h-[50vh] w-auto object-contain rounded-xl shadow-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {selectedProof.paymentScreenshotUrl && (
                  <a
                    href={getMediaUrl(selectedProof.paymentScreenshotUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    Open original full-size image <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {selectedProof.dmzpCardUrl && (
                  <a
                    href={getMediaUrl(selectedProof.dmzpCardUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    Open DMZP card <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {selectedProof.paymentScreenshotUrl && (
                <div className="flex items-center gap-2">
                  {selectedProof.paymentStatus === 'pending_verification' && (
                    <>
                      <button
                        onClick={() => {
                          handleAction(selectedProof.id, 'reject')
                          setSelectedProof(null)
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 rounded-lg border border-red-200"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          handleAction(selectedProof.id, 'approve')
                          setSelectedProof(null)
                        }}
                        className="px-4 py-1.5 text-xs font-semibold bg-green-600 text-white hover:bg-green-700 rounded-lg shadow-sm"
                      >
                        Approve Payment
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Main Tours Page ──────────────────────────────────────────────────────────

export function Tours() {
  const [tours, setTours] = useState<Tour[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editTour, setEditTour] = useState<Tour | null>(null)
  const [regPanel, setRegPanel] = useState<Tour | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const loadTours = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<any>('/tours?limit=100')
      if (res.success) setTours(res.data?.data || [])
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTours()
  }, [loadTours])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tour and all its registrations?')) return
    setDeleting(id)
    try {
      const res = await apiClient.delete(`/tours/${id}`)
      if (res.success) {
        await loadTours()
      } else {
        alert(res.error || 'Failed to delete tour')
      }
    } catch (e: any) {
      alert(e.message || 'Failed to delete tour')
    }
    setDeleting(null)
  }

  const filtered = tours.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase())
  )

  const publicUrl = (slug: string) => `${window.location.origin}/tour/${slug}`

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(publicUrl(slug))
    alert('Public tour registration link copied to clipboard!')
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tours Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create tours with place photos, collect registrations, and verify payment screenshots
          </p>
        </div>
        <button
          onClick={() => {
            setEditTour(null)
            setWizardOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Tour
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by tour name or location..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        />
      </div>

      {/* Tour Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 p-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold text-base">No tours found</p>
          <p className="text-gray-400 text-sm mt-1">
            Click "+ Create Tour" to set up your first tour with place photos and registration form.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tour) => (
            <div
              key={tour.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all flex flex-col"
            >
              {/* Tour Place Picture Banner */}
              <div className="h-44 bg-gradient-to-br from-teal-500 to-emerald-600 relative overflow-hidden">
                {tour.coverImage ? (
                  <img
                    src={getMediaUrl(tour.coverImage)}
                    alt={tour.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/50">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs ${
                      STATUS_BADGES[tour.status]
                    }`}
                  >
                    {tour.status}
                  </span>
                </div>
                {tour.isPaid && (
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-xl text-sm font-bold text-gray-900 shadow-sm">
                    ₹{tour.price.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">{tour.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">{tour.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                    <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>
                      {formatDate(tour.startDate)} – {formatDate(tour.endDate)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setRegPanel(tour)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <ClipboardList className="w-3.5 h-3.5" /> Registrations
                  </button>
                  <button
                    onClick={() => {
                      setEditTour(tour)
                      setWizardOpen(true)
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-medium transition-colors"
                    title="Edit tour"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => copyLink(tour.slug)}
                    title="Copy public link"
                    className="flex items-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-medium transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(tour.id)}
                    disabled={deleting === tour.id}
                    className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-medium disabled:opacity-50 transition-colors"
                    title="Delete tour"
                  >
                    {deleting === tour.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {wizardOpen && (
        <TourWizard
          editTour={editTour}
          onClose={() => {
            setWizardOpen(false)
            setEditTour(null)
          }}
          onSaved={() => {
            setWizardOpen(false)
            setEditTour(null)
            loadTours()
          }}
        />
      )}

      {regPanel && <RegistrationPanel tour={regPanel} onClose={() => setRegPanel(null)} />}
    </div>
  )
}

export default Tours
