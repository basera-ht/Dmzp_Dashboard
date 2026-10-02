import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import {
  Calendar, MapPin, CheckCircle2, Download, Printer,
  ArrowLeft, Users, ShieldCheck, ExternalLink, Loader2,
  AlertCircle, Ticket, Share2
} from 'lucide-react'
import QRCode from 'react-qr-code'
import { API_BASE_URL, getMediaUrl } from '../../lib/api'
import type { Tour, TourRegistration } from './Tours'

function formatDate(dateVal: string | Date | undefined): string {
  if (!dateVal) return 'TBA'
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function TourTicketView() {
  const { slug, regId } = useParams<{ slug?: string; regId?: string }>()
  const [data, setData] = useState<{ tour: Tour; registration: TourRegistration } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!regId) return
    setLoading(true)
    fetch(`${API_BASE_URL}/public/tours/registrations/${regId}/ticket`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw { message: json.error || 'Failed to load ticket', code: json.code || '' }
        return json
      })
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data)
        } else {
          setError(res.error || 'Ticket not found')
        }
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to load ticket')
        setErrorCode(err.code || '')
      })
      .finally(() => setLoading(false))
  }, [regId])

  const handlePrint = () => {
    window.print()
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-9 h-9 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Loading your tour ticket...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    const isPending = errorCode === 'TICKET_NOT_APPROVED'
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
          {isPending ? (
            <>
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ticket Pending Approval</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your registration is under review. Once the admin verifies your payment, your ticket and WhatsApp community invite will be emailed to you.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ticket Not Found</h2>
              <p className="text-sm text-gray-500 mb-6">
                {error || 'The requested ticket could not be found. Please check your link or contact the tour organizer.'}
              </p>
            </>
          )}
          <Link
            to={slug ? `/tour/${slug}` : '/'}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            <ArrowLeft className="w-4 h-4" /> Go back to tour
          </Link>
        </div>
      </div>
    )
  }

  const { tour, registration } = data
  const ticketCode = registration.ticketCode || `DMZP-TOUR-${registration.id.toString().padStart(5, '0')}`
  const pdfDownloadUrl = `${API_BASE_URL}/public/tours/registrations/${registration.id}/ticket/pdf`

  return (
    <div className="min-h-screen bg-slate-900/5 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Navigation & Actions Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
          <Link
            to={`/tour/${tour.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white px-3.5 py-2 rounded-xl shadow-xs border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Tour Page
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white px-3.5 py-2 rounded-xl shadow-xs border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Copy link to this ticket"
            >
              <Share2 className="w-3.5 h-3.5 text-gray-500" />
              {copied ? 'Link Copied!' : 'Share Pass'}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white px-3.5 py-2 rounded-xl shadow-xs border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" /> Print
            </button>

            <a
              href={pdfDownloadUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF Ticket
            </a>
          </div>
        </div>

        {/* Digital Ticket Pass Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200/80">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 p-6 sm:p-8 text-white relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-teal-300 mb-1">
                  Delhi Mizo Zirlai Pawl (DMZP)
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                  Official Tour Boarding Pass
                </h1>
                <p className="text-xs text-teal-200/80 mt-1">
                  Issued under DMZP Student Welfare & Adventure Community
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex flex-col items-end">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed & Verified
                </span>
                <span className="text-[11px] font-mono text-teal-200 mt-1.5">
                  Ref: {ticketCode}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 sm:p-8">
            {/* Tour Title & Visual Details */}
            <div className="border-b border-gray-100 pb-6 mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
                {tour.title}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Destination</div>
                    <div className="font-semibold text-gray-900">{tour.location}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Schedule</div>
                    <div className="font-semibold text-gray-900">
                      {formatDate(tour.startDate)} – {formatDate(tour.endDate)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Passenger & Ticket Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Attendee Details (2 Cols) */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Passenger Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Full Name</div>
                      <div className="text-base font-bold text-gray-900 mt-0.5">{registration.fullName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Booking Status</div>
                      <div className="text-sm font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Contact Email</div>
                      <div className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{registration.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Phone Number</div>
                      <div className="text-sm font-mono font-semibold text-gray-800 mt-0.5">{registration.phoneNumber}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Amount Paid</div>
                      <div className="text-sm font-bold text-gray-900 mt-0.5">
                        {registration.amountPaid > 0 ? `₹${registration.amountPaid.toLocaleString('en-IN')}` : (tour.isPaid ? `₹${tour.price.toLocaleString('en-IN')}` : 'Free Registration')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Issued On</div>
                      <div className="text-sm text-gray-700 mt-0.5">{formatDate(registration.createdAt)}</div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Community Box */}
                {tour.whatsappGroupUrl ? (
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50/60 border-2 border-emerald-400/60 rounded-2xl p-5 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase mb-1">
                          Official Tour Community
                        </div>
                        <h4 className="text-base font-extrabold text-emerald-950">
                          Join Tour WhatsApp Group
                        </h4>
                        <p className="text-xs text-emerald-800/90 mt-1 max-w-md leading-relaxed">
                          Get live boarding point announcements, departure timings, trip packing tips, and coordinate with organizers.
                        </p>
                      </div>

                      <a
                        href={tour.whatsappGroupUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-all shrink-0 hover:scale-[1.02]"
                      >
                        Join WhatsApp Group <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-xs text-gray-500">
                    ℹ️ For tour updates, the organizers will contact you via email ({registration.email}) and phone.
                  </div>
                )}
              </div>

              {/* QR Code Verification Stub (1 Col) */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 flex flex-col items-center justify-center text-center">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Check-in QR Pass
                </div>

                <div className="bg-white p-3 rounded-xl shadow-xs border border-gray-200 inline-block mb-3">
                  <QRCode value={window.location.href} size={130} />
                </div>

                <code className="text-xs font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded border border-gray-200 mb-1">
                  {ticketCode}
                </code>
                <p className="text-[10px] text-gray-400">
                  Scan at boarding desk to verify admission
                </p>
              </div>
            </div>

            {/* Travel Guidelines Notice */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed">
              <h5 className="font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" /> Important Boarding Guidelines
              </h5>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800/90 pl-1">
                <li>Please carry this digital boarding pass or a physical printout to the departure venue.</li>
                <li>An original government photo ID (Aadhaar / Voter ID / Driving License) is mandatory.</li>
                <li>Arrive at the designated boarding location 30 minutes before the scheduled departure time.</li>
                <li>Follow guidelines and instructions given by the DMZP tour coordinators.</li>
              </ul>
            </div>
          </div>

          {/* Ticket Footer */}
          <div className="bg-gray-50 p-4 border-t border-gray-100 text-center text-xs text-gray-400">
            Delhi Mizo Zirlai Pawl (DMZP) · Dedicated to student welfare and educational adventures since 1959
          </div>
        </div>
      </div>
    </div>
  )
}
export default TourTicketView
