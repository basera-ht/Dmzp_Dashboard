import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import QRCode from 'react-qr-code'
import {
  MapPin, Calendar, Users, IndianRupee, Copy, Check,
  AlertCircle, Loader2, Upload, ChevronRight, CheckCircle2,
  ChevronLeft, ImageIcon, X, Ticket, ExternalLink,
} from 'lucide-react'
import { API_BASE_URL, getMediaUrl } from '../../lib/api'
import type { Tour } from './Tours'

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

async function publicFetch(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE_URL}/public/tours${url}`, {
    ...options,
    headers: { 'X-Requested-With': 'XMLHttpRequest', ...options?.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PublicTourView() {
  const { slug } = useParams<{ slug: string }>()
  const [tour, setTour] = useState<Tour | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // registration form state
  const [step, setStep] = useState(0) // 0=details, 1=payment, 2=done
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({})
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copied2, setCopied2] = useState(false)
  const [completedReg, setCompletedReg] = useState<{ id: number; ticketCode?: string } | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    publicFetch(`/t/${slug}`)
      .then((res) => {
        setTour(res.data)
        setError('')
      })
      .catch((e) => setError(e.message || 'Tour not found'))
      .finally(() => setLoading(false))
  }, [slug])

  // Handle screenshot selection and preview URL
  const handleScreenshotChange = (file: File | null) => {
    setScreenshot(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setScreenshotPreview(url)
    } else {
      setScreenshotPreview(null)
    }
  }

  const upiDeepLink = tour?.upiId
    ? `upi://pay?pa=${encodeURIComponent(tour.upiId)}&pn=Tour+Organizer&am=${tour.price}&cu=INR&tn=${encodeURIComponent(tour.title)}`
    : ''

  const upiDeepLink2 = tour?.upiId2
    ? `upi://pay?pa=${encodeURIComponent(tour.upiId2)}&pn=Tour+Organizer&am=${tour.price}&cu=INR&tn=${encodeURIComponent(tour.title)}`
    : ''

  const copyUpi = () => {
    if (tour?.upiId) {
      navigator.clipboard.writeText(tour.upiId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyUpi2 = () => {
    if (tour?.upiId2) {
      navigator.clipboard.writeText(tour.upiId2)
      setCopied2(true)
      setTimeout(() => setCopied2(false), 2000)
    }
  }

  const isEmailValid = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())

  const canSubmitStep0 = () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !isEmailValid(email)) return false
    const requiredFields = tour?.customFormFields?.filter((f) => f.required) || []
    return requiredFields.every((f) => customResponses[f.id]?.trim())
  }

  // Payment screenshot is required for paid tours!
  const canSubmitStep1 = () => Boolean(screenshot)

  const handleSubmit = async () => {
    if (!tour) return
    if (tour.isPaid && !screenshot) {
      setSubmitError('Please upload your payment screenshot to proceed.')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const formData = new FormData()
      formData.append('fullName', fullName.trim())
      formData.append('email', email.trim())
      formData.append('phoneNumber', phone.trim())
      formData.append('customResponses', JSON.stringify(customResponses))
      formData.append('amountPaid', String(tour.isPaid ? tour.price : 0))
      if (screenshot) {
        formData.append('paymentScreenshot', screenshot)
      }

      const regData = await fetch(`${API_BASE_URL}/public/tours/t/${slug}/register`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      }).then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Registration failed')
        return data
      })

      if (regData?.data) {
        setCompletedReg(regData.data)
      }

      setStep(tour.isPaid ? 2 : 1)
    } catch (e: any) {
      setSubmitError(e.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Tour not found</h1>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">{error || 'This tour may have been removed or is no longer available.'}</p>
          <Link to="/" className="inline-block mt-4 text-teal-600 hover:text-teal-700 text-sm font-semibold">← Go back to dashboard</Link>
        </div>
      </div>
    )
  }

  // ── Success State ──────────────────────────────────────────────────────────

  const isSuccessStep = (tour.isPaid && step === 2) || (!tour.isPaid && step === 1)

  if (isSuccessStep) {
    const isFree = !tour.isPaid
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full text-center border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isFree ? 'Registration Confirmed! 🎉' : 'Registration Submitted!'}
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            {isFree
              ? 'You are successfully registered for the tour! Your official ticket has been issued and sent to your email.'
              : 'Thank you for registering! Your payment screenshot has been uploaded. Once verified by our team, your tour ticket and WhatsApp community invite will be emailed to you.'}
          </p>

          {/* Ticket Reference Badge */}
          {completedReg?.ticketCode && (
            <div className="inline-block mt-3 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-mono font-bold text-teal-800">
              Ticket Code: {completedReg.ticketCode}
            </div>
          )}

          {/* WhatsApp Group Callout (Immediate for Free Tours) */}
          {isFree && tour.whatsappGroupUrl && (
            <div className="mt-5 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                Official Tour Community
              </div>
              <p className="text-xs text-emerald-700 mb-3">
                Join the WhatsApp group for live departure updates, itinerary, and travel coordination:
              </p>
              <a
                href={tour.whatsappGroupUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-transform hover:scale-[1.02]"
              >
                Join Tour WhatsApp Group <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isFree && completedReg?.ticketCode && (
              <Link
                to={`/tour/${tour.slug}/ticket/${encodeURIComponent(completedReg.ticketCode)}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                <Ticket className="w-3.5 h-3.5" /> View Tour Ticket Pass
              </Link>
            )}
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Return Home
            </Link>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left text-sm space-y-1.5 border border-gray-100">
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Registration Details</div>
            <div className="text-gray-900 font-semibold mb-2">{tour.title}</div>
            <div className="text-gray-600 text-xs">Participant: <span className="text-gray-900 font-medium">{fullName}</span></div>
            <div className="text-gray-600 text-xs">Email: <span className="text-gray-900 font-medium">{email}</span></div>
            <div className="text-gray-600 text-xs">Phone: <span className="text-gray-900 font-medium">{phone}</span></div>
            {tour.isPaid && (
              <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-600">Verification Status:</span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-semibold">
                  Pending Verification
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner / Place Picture */}
      <div className="h-56 sm:h-72 bg-gradient-to-br from-teal-600 to-emerald-700 relative overflow-hidden">
        {tour.coverImage ? (
          <img
            src={getMediaUrl(tour.coverImage)}
            alt={tour.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40">
            <ImageIcon className="w-16 h-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-20 relative z-10 pb-16">
        {/* Tour Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 border border-gray-100">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{tour.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-5">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <MapPin className="w-4 h-4 text-teal-600" /> {tour.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600" /> {formatDate(tour.startDate)} – {formatDate(tour.endDate)}
            </span>
            {tour.capacity > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-600" /> {tour.capacity} max spots
              </span>
            )}
          </div>

          {tour.isPaid && (
            <div className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-teal-50 border border-teal-100 rounded-xl text-teal-700 font-bold text-xl mb-4">
              <IndianRupee className="w-5 h-5" /> {tour.price.toLocaleString('en-IN')}{' '}
              <span className="text-xs font-medium text-teal-600 ml-1">per person</span>
            </div>
          )}

          {tour.description && (
            <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line border-t border-gray-100 pt-4 mt-2">
              {tour.description}
            </div>
          )}
        </div>

        {/* Registration Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              {step === 0 ? 'Participant Information' : 'Payment Verification'}
            </h2>
            {tour.isPaid && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                Step {step + 1} of 2
              </span>
            )}
          </div>

          {submitError && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Step 0: Attendee Details */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Email Address *</label>
                  {email.trim() && !isEmailValid(email) && (
                    <span className="text-xs text-red-500 font-medium">Invalid email address</span>
                  )}
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    email.trim() && !isEmailValid(email) ? 'border-red-300 bg-red-50/20' : 'border-gray-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone / WhatsApp Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Custom Fields */}
              {tour.customFormFields?.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={customResponses[field.id] || ''}
                      onChange={(e) =>
                        setCustomResponses({ ...customResponses, [field.id]: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  )}
                  {field.type === 'textarea' && (
                    <textarea
                      value={customResponses[field.id] || ''}
                      onChange={(e) =>
                        setCustomResponses({ ...customResponses, [field.id]: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  )}
                  {field.type === 'select' && (
                    <select
                      value={customResponses[field.id] || ''}
                      onChange={(e) =>
                        setCustomResponses({ ...customResponses, [field.id]: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Select option...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              <button
                onClick={() => (tour.isPaid ? setStep(1) : handleSubmit())}
                disabled={!canSubmitStep0() || submitting}
                className="w-full mt-4 py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {tour.isPaid ? (
                  <>
                    Proceed to Payment <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  'Complete Free Registration'
                )}
              </button>
            </div>
          )}

          {/* Step 1: Payment (Paid tours only) */}
          {step === 1 && tour.isPaid && (
            <div className="space-y-6">
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium"
              >
                <ChevronLeft className="w-4 h-4" /> Back to details
              </button>

              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-6 text-center">
                <h3 className="font-bold text-gray-900 text-lg mb-1">Scan & Pay via UPI</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Pay <span className="font-bold text-teal-800">₹{tour.price.toLocaleString('en-IN')}</span> using any UPI app
                </p>

                <div className={`flex flex-wrap items-start justify-center ${tour.upiId2 ? 'gap-6' : 'gap-0'}`}>
                  {/* Primary UPI */}
                  <div className="flex flex-col items-center">
                    {tour.upiId2 && (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-2 bg-teal-100 px-2.5 py-0.5 rounded-full">Primary Account</div>
                    )}
                    {/* QR Code */}
                    <div className="bg-white rounded-2xl p-4 inline-block shadow-sm border border-gray-200/80 mb-3">
                      {tour.upiQrImage ? (
                        <img
                          src={getMediaUrl(tour.upiQrImage)}
                          alt="UPI QR Code"
                          className="w-44 h-44 object-contain rounded-lg"
                        />
                      ) : (
                        <QRCode value={upiDeepLink} size={176} />
                      )}
                    </div>

                    {/* UPI ID display & copy */}
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">UPI ID:</span>
                      <code className="bg-white px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-gray-900 border border-gray-200">
                        {tour.upiId}
                      </code>
                      <button
                        onClick={copyUpi}
                        className="p-1 hover:bg-white rounded-lg text-teal-600 transition-colors border border-transparent hover:border-gray-200"
                        title="Copy UPI ID"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Secondary UPI (Optional) */}
                  {tour.upiId2 && (
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2 bg-amber-100 px-2.5 py-0.5 rounded-full">Backup Account</div>
                      <div className="bg-white rounded-2xl p-4 inline-block shadow-sm border border-gray-200/80 mb-3">
                        {tour.upiQrImage2 ? (
                          <img
                            src={getMediaUrl(tour.upiQrImage2)}
                            alt="Backup UPI QR Code"
                            className="w-44 h-44 object-contain rounded-lg"
                          />
                        ) : (
                          <QRCode value={upiDeepLink2} size={176} />
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">UPI ID:</span>
                        <code className="bg-white px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-gray-900 border border-gray-200">
                          {tour.upiId2}
                        </code>
                        <button
                          onClick={copyUpi2}
                          className="p-1 hover:bg-white rounded-lg text-teal-600 transition-colors border border-transparent hover:border-gray-200"
                          title="Copy Backup UPI ID"
                        >
                          {copied2 ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {tour.upiId2 && (
                  <p className="text-xs text-gray-500 mt-3 italic">
                    You can pay to either account. Use the backup if the primary is not accepting payments.
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4">
                <h4 className="text-sm font-bold text-amber-900 mb-1.5">How to complete payment:</h4>
                <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Scan the QR code or use the UPI ID in GPay / PhonePe / Paytm / BHIM.</li>
                  <li>Make payment of exactly <strong>₹{tour.price}</strong>.</li>
                  <li>Take a screenshot of your successful transaction receipt.</li>
                  <li><strong>Upload the payment screenshot below</strong> to verify your booking.</li>
                </ol>
              </div>

              {/* Payment Screenshot Upload (REQUIRED) */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">
                  Payment Screenshot <span className="text-red-500">* (Required)</span>
                </label>

                {screenshotPreview ? (
                  <div className="relative rounded-2xl border-2 border-teal-500/40 bg-teal-50/30 p-4 flex items-center gap-4">
                    <img
                      src={screenshotPreview}
                      alt="Payment screenshot preview"
                      className="w-20 h-20 object-cover rounded-xl border border-teal-200 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{screenshot?.name}</p>
                      <p className="text-xs text-gray-500">
                        {screenshot ? `${(screenshot.size / 1024).toFixed(1)} KB` : ''}
                      </p>
                      <label className="inline-block mt-1 text-xs text-teal-700 hover:text-teal-800 font-semibold cursor-pointer underline rounded focus-within:ring-2 focus-within:ring-teal-500 focus-within:outline-none">
                        Change image
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={(e) => handleScreenshotChange(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleScreenshotChange(null)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white"
                      title="Remove screenshot"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/20 hover:bg-teal-50/40 rounded-2xl cursor-pointer transition-colors text-center focus-within:ring-2 focus-within:ring-teal-500 focus-within:outline-none">
                    <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Click or drag to upload payment screenshot
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">JPG, PNG, WebP or GIF up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => handleScreenshotChange(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmitStep1() || submitting}
                className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading & Submitting...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Submit Registration with Payment Proof
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default PublicTourView
