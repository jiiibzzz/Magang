import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/useAuth'
import Toast from '../../components/Toast'
import { LABEL_TAHAP, LABEL_STATUS, WARNA_STATUS, formatTanggal } from './negosiasiLabel'

export default function Negosiasi() {
  const { user } = useAuth()
  const isCustomer = user?.roles?.some((role) => role.name === 'customer')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('aktif')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [toast, setToast] = useState(null)

  const muat = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page })
    if (status) params.set('status', status)
    api.get(`/negosiasi?${params}`)
      .then((res) => {
        setItems(res.data.data || [])
        setTotalPages(res.data.last_page || 1)
      })
      .catch((err) => {
        console.error(err)
        setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal memuat data negosiasi.' })
      })
      .finally(() => setLoading(false))
  }, [page, status])

  useEffect(() => { muat() }, [muat])

  return (
    <div className="space-y-6">
      <Toast show={!!toast} type={toast?.type} message={toast?.msg} onClose={() => setToast(null)} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-secondary">Negosiasi Proyek</h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {isCustomer
              ? 'Pembahasan kebutuhan dan harga proyek Anda bersama tim marketing.'
              : 'Kelola pengumpulan kebutuhan, rancangan, dan negosiasi harga dengan customer.'}
          </p>
        </div>
        <select
          className="select select-bordered select-sm rounded-xl text-sm self-start sm:self-auto"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="">Semua status</option>
          {Object.entries(LABEL_STATUS).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>{label}</option>
          ))}
        </select>
      </div>

      <div className="card bg-base-100 rounded-3xl border border-base-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-sm">
            <thead>
              <tr className="bg-base-200/50 text-secondary border-b border-base-200">
                <th className="font-bold text-xs">Penawaran</th>
                <th className="font-bold text-xs">{isCustomer ? 'Marketing' : 'Customer'}</th>
                <th className="font-bold text-xs">Tahap</th>
                <th className="font-bold text-xs text-center">Status</th>
                <th className="font-bold text-xs">Batas respons</th>
                <th className="font-bold text-xs text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-base-content/40 font-medium">
                    Belum ada negosiasi{status ? ` dengan status "${LABEL_STATUS[status]}"` : ''}.
                  </td>
                </tr>
              ) : (
                items.map((n) => (
                  <tr key={n.id} className="hover:bg-base-100/50 transition-colors">
                    <td className="font-semibold text-secondary">
                      <div className="max-w-[220px] truncate" title={n.penawaran?.judul}>{n.penawaran?.judul || `Negosiasi #${n.id}`}</div>
                      <div className="text-[10px] text-base-content/50 font-normal">Dimulai {formatTanggal(n.created_at)}</div>
                    </td>
                    <td className="text-xs">{isCustomer ? n.marketing?.name : n.customer?.name}</td>
                    <td className="text-xs">{LABEL_TAHAP[n.tahap] || n.tahap}</td>
                    <td className="text-center">
                      <span className={`badge ${WARNA_STATUS[n.status] || ''} border-0 font-semibold text-xs rounded-md px-2.5 py-1`}>
                        {LABEL_STATUS[n.status] || n.status}
                      </span>
                    </td>
                    <td className="text-xs">{n.batas_respons ? formatTanggal(n.batas_respons) : '-'}</td>
                    <td className="text-center">
                      <Link to={`/admin/negosiasi/${n.id}`} className="btn btn-xs btn-ghost text-primary font-bold hover:bg-primary/10">
                        Buka &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn btn-sm rounded-xl" disabled={page <= 1} onClick={() => setPage(page - 1)}>&larr; Sebelumnya</button>
          <span className="text-sm self-center text-base-content/60">Halaman {page} dari {totalPages}</span>
          <button className="btn btn-sm rounded-xl" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Berikutnya &rarr;</button>
        </div>
      )}
    </div>
  )
}
