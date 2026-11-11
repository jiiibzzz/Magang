import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/useAuth'
import Toast from '../../components/Toast'
import { formatRupiah } from '../../utils/format'

export default function RiwayatTransaksi() {
  const { user, hasPermission } = useAuth()
  const isMarketing = hasPermission('kelola_penawaran')
  const isCustomer = user?.roles?.some(role => role.name === 'customer')

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [sort, setSort] = useState('terbaru')
  const [customerId, setCustomerId] = useState('')

  const [summary, setSummary] = useState(null)
  const [topCustomers, setTopCustomers] = useState([])
  const [customers, setCustomers] = useState([])

  const [toast, setToast] = useState(null)
  const [showToast, setShowToast] = useState(false)

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const renderHarga = (val) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-[11px] font-normal text-base-content/50 italic">Sesuai Kontrak</span>
    }
    return formatRupiah(val)
  }

  const formatTanggal = (val) => {
    if (!val) return '-'
    return new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const fetchData = () => {
    setLoading(true)
    if (isMarketing) {
      const params = new URLSearchParams({ page, search, sort })
      if (dari) params.append('dari', dari)
      if (sampai) params.append('sampai', sampai)
      if (customerId) params.append('customer_id', customerId)

      api.get(`/admin/riwayat-transaksi?${params}`)
        .then(res => {
          setData(res.data.data?.data || [])
          setTotalPages(res.data.data?.last_page || 1)
          setSummary(res.data.summary || null)
          setTopCustomers(res.data.top_customers || [])
        })
        .catch(() => showToastMsg('Gagal memuat data riwayat transaksi.', 'error'))
        .finally(() => setLoading(false))
    } else {
      const params = new URLSearchParams({ page, search })
      if (dari) params.append('dari', dari)
      if (sampai) params.append('sampai', sampai)

      api.get(`/riwayat-transaksi?${params}`)
        .then(res => {
          setData(res.data.data || [])
          setTotalPages(res.data.last_page || 1)
        })
        .catch(() => showToastMsg('Gagal memuat data riwayat transaksi.', 'error'))
        .finally(() => setLoading(false))
    }
  }

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/users?limit=100')
      const custs = (res.data.data || []).filter(u => u.roles?.some(r => r.name === 'customer'))
      setCustomers(custs)
    } catch {}
  }

  useEffect(() => {
    fetchData()
  }, [page, search, dari, sampai, sort, customerId])

  useEffect(() => {
    if (isMarketing) fetchCustomers()
  }, [isMarketing])

  const statusProyekBadge = (proyek, statusStr) => {
    const st = proyek?.status_proyek || statusStr || 'selesai'
    const colors = {
      'pengajuan': 'bg-gray-400',
      'planning': 'bg-blue-500',
      'Ditindaklanjuti': 'bg-blue-500',
      'on progress': 'bg-indigo-500',
      'Proses Pengerjaan': 'bg-indigo-500',
      'testing': 'bg-purple-500',
      'selesai': 'bg-emerald-500',
      'Selesai': 'bg-emerald-500',
      'Maintenance': 'bg-teal-500',
      'Arsip': 'bg-slate-500',
      'ditolak': 'bg-rose-500',
    }
    return (
      <span className={`badge ${colors[st] || 'bg-emerald-500'} text-white border-0 font-semibold text-[10px] rounded-full px-2.5 py-0.5 uppercase`}>
        {st}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <Toast show={showToast && !!toast} type={toast?.type === 'error' ? 'error' : 'success'} message={toast?.msg} onClose={() => setShowToast(false)} />

      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-secondary">Riwayat Transaksi</h1>
        <p className="text-xs sm:text-sm text-base-content/60 mt-1">
          {isCustomer ? 'Daftar seluruh transaksi pembelian Anda kepada Kurva.' : 'Seluruh riwayat transaksi pembelian customer.'}
        </p>
      </div>

      {isMarketing && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card bg-gradient-to-br from-primary to-[#0F4A3D] text-white rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold opacity-80">Total Transaksi</div>
            <div className="text-2xl font-extrabold mt-1">{summary.total_transaksi}</div>
          </div>
          <div className="card bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold opacity-80">Total Nilai</div>
            <div className="text-2xl font-extrabold mt-1">{formatRupiah(summary.total_nilai)}</div>
          </div>
          <div className="card bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl p-4 shadow-md">
            <div className="text-xs font-bold opacity-80">Customer Unik</div>
            <div className="text-2xl font-extrabold mt-1">{summary.total_customer}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          className="input input-bordered w-full text-sm rounded-xl focus:border-primary/50 focus:outline-none"
          placeholder={isMarketing ? 'Cari judul atau nama customer...' : 'Cari berdasarkan judul...'}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
        <input
          type="date"
          className="input input-bordered text-sm rounded-xl focus:border-primary/50 focus:outline-none"
          value={dari}
          onChange={(e) => { setDari(e.target.value); setPage(1) }}
          title="Dari tanggal"
        />
        <input
          type="date"
          className="input input-bordered text-sm rounded-xl focus:border-primary/50 focus:outline-none"
          value={sampai}
          onChange={(e) => { setSampai(e.target.value); setPage(1) }}
          title="Sampai tanggal"
        />
        {isMarketing && (
          <>
            <select
              className="select select-bordered text-sm rounded-xl"
              value={customerId}
              onChange={(e) => { setCustomerId(e.target.value); setPage(1) }}
            >
              <option value="">Semua Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              className="select select-bordered text-sm rounded-xl"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1) }}
            >
              <option value="terbaru">Terbaru</option>
              <option value="terlama">Terlama</option>
              <option value="harga_tertinggi">Harga Tertinggi</option>
              <option value="harga_terendah">Harga Terendah</option>
            </select>
          </>
        )}
      </div>

      <div className="card bg-base-100 rounded-3xl border border-base-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-sm">
            <thead>
              <tr className="bg-base-200/50 text-secondary border-b border-base-200">
                {isMarketing && <th className="font-bold text-xs">Customer</th>}
                <th className="font-bold text-xs">Judul Penawaran</th>
                <th className="font-bold text-xs">Produk / Layanan</th>
                <th className="font-bold text-xs text-right">Harga</th>
                <th className="font-bold text-xs text-center">Tanggal Deal</th>
                <th className="font-bold text-xs text-center">Status Proyek</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isMarketing ? 6 : 5} className="text-center py-8">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={isMarketing ? 6 : 5} className="text-center py-8 text-base-content/40 font-medium">Belum ada riwayat transaksi.</td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-base-100/50 transition-colors">
                    {isMarketing && (
                      <td className="text-xs">
                        <div className="font-semibold">{item.customer?.name}</div>
                        <div className="text-[10px] text-base-content/50">{item.customer?.email}</div>
                      </td>
                    )}
                    <td className="font-semibold text-secondary">
                      <div className="max-w-[200px] truncate" title={item.judul}>{item.judul}</div>
                      <div className="text-[10px] text-base-content/50 font-normal truncate max-w-[200px]">{item.deskripsi}</div>
                    </td>
                    <td className="text-xs">
                      <div>{item.produk?.nama || '-'}</div>
                      <div className="text-[10px] text-base-content/50">{item.layanan?.title || ''}</div>
                    </td>
                    <td className="text-right font-bold text-sm text-primary">{renderHarga(item.harga)}</td>
                    <td className="text-center text-xs">{formatTanggal(item.tanggal_deal)}</td>
                    <td className="text-center">{statusProyekBadge(item.proyek, item.status_proyek)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-base-200 flex justify-between items-center bg-base-50">
            <span className="text-xs text-base-content/60 font-semibold">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn btn-outline btn-xs rounded-lg font-bold">Sebelumnya</button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="btn btn-outline btn-xs rounded-lg font-bold">Selanjutnya</button>
            </div>
          </div>
        )}
      </div>

      {isMarketing && topCustomers.length > 0 && (
        <div className="card bg-base-100 rounded-3xl border border-base-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-base-200">
            <h2 className="font-extrabold text-secondary text-sm">Top 10 Customer</h2>
            <p className="text-[10px] text-base-content/50 mt-0.5">Customer dengan transaksi terbanyak</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-sm">
              <thead>
                <tr className="bg-base-200/50 text-secondary border-b border-base-200">
                  <th className="font-bold text-xs">#</th>
                  <th className="font-bold text-xs">Nama</th>
                  <th className="font-bold text-xs">Email</th>
                  <th className="font-bold text-xs">No. WA</th>
                  <th className="font-bold text-xs text-center">Jumlah Transaksi</th>
                  <th className="font-bold text-xs text-right">Total Harga</th>
                  <th className="font-bold text-xs text-center">Terakhir Deal</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, idx) => (
                  <tr key={c.customer_id} className="hover:bg-base-100/50 transition-colors">
                    <td className="font-bold text-primary">{idx + 1}</td>
                    <td className="font-semibold text-secondary">{c.name}</td>
                    <td className="text-xs text-base-content/60">{c.email}</td>
                    <td className="text-xs">{c.phone || <span className="text-base-content/30">-</span>}</td>
                    <td className="text-center">
                      <span className="badge bg-primary text-white border-0 font-bold text-xs rounded-md px-2.5 py-1">{c.jumlah_transaksi}x</span>
                    </td>
                    <td className="text-right font-bold text-sm text-emerald-600">{formatRupiah(c.total_harga)}</td>
                    <td className="text-center text-xs">{formatTanggal(c.terakhir_deal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
