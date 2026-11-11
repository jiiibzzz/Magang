import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useNavigate } from 'react-router-dom'
import Toast from '../../components/Toast'
import { formatRupiah } from '../../utils/format'

const SEGMENT_CONFIG = {
  'Champions': { color: 'bg-emerald-500', desc: 'Customer terbaik — baru, sering, spending tinggi' },
  'Loyal Customers': { color: 'bg-blue-500', desc: 'Sering bertransaksi, nilai transaksi bagus' },
  'Promising': { color: 'bg-teal-500', desc: 'Baru bertransaksi beberapa kali, potensi berkembang' },
  'New': { color: 'bg-cyan-500', desc: 'Pelanggan baru, transaksi pertama' },
  'Abandoned Checkouts': { color: 'bg-amber-400', desc: 'Mengajukan order tapi belum ada kesepakatan nilai' },
  'Warm Leads Cold Leads': { color: 'bg-orange-400', desc: 'Interaksi mulai mendingin / menurun' },
  'Need Attention': { color: 'bg-amber-500', desc: 'Di atas rata-rata tapi mulai melambat' },
  'based on past purchases': { color: 'bg-indigo-500', desc: 'Nilai transaksi masa lalu tinggi, potensi besar' },
  "Shouldn't Lose": { color: 'bg-rose-500', desc: 'Pelanggan bernilai tinggi yang hampir hilang' },
  'Sleepers': { color: 'bg-purple-500', desc: 'Lama tidak aktif, frekuensi dan nilai rendah' },
  'Lost': { color: 'bg-slate-500', desc: 'Sudah sangat lama tidak aktif dan nilai minim' },
}

export default function RfmAnalysis() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [segmentsSummary, setSegmentsSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSegment, setFilterSegment] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])

  const [toast, setToast] = useState(null)
  const [showToast, setShowToast] = useState(false)

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const fetchRfm = () => {
    setLoading(true)
    api.get('/admin/rfm')
      .then(res => {
        setCustomers(res.data.customers || [])
        setSegmentsSummary(res.data.segments_summary || [])
      })
      .catch(() => showToastMsg('Gagal memuat data RFM.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRfm() }, [])

  const filtered = customers.filter(c => {
    if (filterSegment && c.segment !== filterSegment) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const selectAllFiltered = () => {
    const allIds = filtered.map(c => c.customer_id)
    const allSelected = allIds.every(id => selected.includes(id))
    if (allSelected) {
      setSelected(prev => prev.filter(id => !allIds.includes(id)))
    } else {
      setSelected(prev => [...new Set([...prev, ...allIds])])
    }
  }

  const selectSegment = (segment) => {
    const ids = customers.filter(c => c.segment === segment).map(c => c.customer_id)
    const allSelected = ids.every(id => selected.includes(id))
    if (allSelected) {
      setSelected(prev => prev.filter(id => !ids.includes(id)))
    } else {
      setSelected(prev => [...new Set([...prev, ...ids])])
    }
  }

  const handleBuatPromo = () => {
    if (selected.length === 0) {
      showToastMsg('Pilih minimal 1 customer.', 'error')
      return
    }
    const segments = [...new Set(customers.filter(c => selected.includes(c.customer_id)).map(c => c.segment))]
    sessionStorage.setItem('promo_selected', JSON.stringify({ customer_ids: selected, segments }))
    navigate('/admin/promo-campaign')
  }

  return (
    <div className="space-y-6">
      <Toast show={showToast && !!toast} type={toast?.type === 'error' ? 'error' : 'success'} message={toast?.msg} onClose={() => setShowToast(false)} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-secondary">Analisis RFM</h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">Segmentasi customer berdasarkan Recency, Frequency, Monetary</p>
        </div>
        <button
          onClick={handleBuatPromo}
          disabled={selected.length === 0}
          className="btn btn-primary btn-sm rounded-xl gap-2 px-4 text-white border-none shadow-sm font-semibold transition-all duration-200 hover:opacity-90 self-start sm:self-auto disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Buat Promo ({selected.length})
        </button>
      </div>

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {segmentsSummary.map(seg => {
            const cfg = SEGMENT_CONFIG[seg.segment] || { color: 'bg-gray-400', desc: 'Segment pelanggan' }
            const segIds = customers.filter(c => c.segment === seg.segment).map(c => c.customer_id)
            const allSelected = segIds.length > 0 && segIds.every(id => selected.includes(id))
            return (
              <div
                key={seg.segment}
                onClick={() => selectSegment(seg.segment)}
                className={`card cursor-pointer rounded-2xl p-3 shadow-sm border-2 transition-all duration-200 hover:scale-[1.02] ${
                  allSelected ? 'border-primary bg-primary/5' : 'border-base-200 bg-base-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`}></span>
                  <span className="text-[10px] font-extrabold text-secondary uppercase tracking-wide">{seg.segment}</span>
                </div>
                <div className="text-2xl font-extrabold text-secondary">{seg.count}</div>
                <div className="text-[9px] text-base-content/50 mt-0.5 leading-tight">{cfg.desc}</div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          className="input input-bordered w-full text-sm rounded-xl focus:border-primary/50 focus:outline-none"
          placeholder="Cari nama atau email customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select select-bordered text-sm rounded-xl"
          value={filterSegment}
          onChange={(e) => setFilterSegment(e.target.value)}
        >
          <option value="">Semua Segment</option>
          {Object.keys(SEGMENT_CONFIG).map(seg => (
            <option key={seg} value={seg}>{seg}</option>
          ))}
        </select>
      </div>

      <div className="card bg-base-100 rounded-3xl border border-base-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-sm">
            <thead>
              <tr className="bg-base-200/50 text-secondary border-b border-base-200">
                <th className="font-bold text-xs">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-xs"
                    checked={filtered.length > 0 && filtered.every(c => selected.includes(c.customer_id))}
                    onChange={selectAllFiltered}
                  />
                </th>
                <th className="font-bold text-xs">Customer</th>
                <th className="font-bold text-xs">No. WA</th>
                <th className="font-bold text-xs text-center">R</th>
                <th className="font-bold text-xs text-center">F</th>
                <th className="font-bold text-xs text-center">M</th>
                <th className="font-bold text-xs text-center">Recency (hari)</th>
                <th className="font-bold text-xs text-center">Frequency</th>
                <th className="font-bold text-xs text-right">Monetary</th>
                <th className="font-bold text-xs text-center">Segment</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-base-content/40 font-medium">Tidak ada data customer.</td>
                </tr>
              ) : (
                filtered.map(c => {
                  const cfg = SEGMENT_CONFIG[c.segment] || { color: 'bg-gray-400', desc: 'Segment pelanggan' }
                  return (
                    <tr key={c.customer_id} className="hover:bg-base-100/50 transition-colors">
                      <td>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary checkbox-xs"
                          checked={selected.includes(c.customer_id)}
                          onChange={() => toggleSelect(c.customer_id)}
                        />
                      </td>
                      <td>
                        <div className="font-semibold text-secondary">{c.name}</div>
                        <div className="text-[10px] text-base-content/50">{c.email}</div>
                      </td>
                      <td className="text-xs">{c.phone || <span className="text-base-content/30">-</span>}</td>
                      <td className="text-center font-bold">{c.r_score}</td>
                      <td className="text-center font-bold">{c.f_score}</td>
                      <td className="text-center font-bold">{c.m_score}</td>
                      <td className="text-center text-xs">{c.recency_days} hari</td>
                      <td className="text-center text-xs">{c.frequency}x</td>
                      <td className="text-right font-bold text-sm text-primary">{formatRupiah(c.monetary)}</td>
                      <td className="text-center">
                        <span className={`badge ${cfg.color} text-white border-0 font-semibold text-[10px] rounded-full px-2 py-0.5`}>
                          {c.segment}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
