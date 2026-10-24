import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/useAuth'
import Toast from '../../components/Toast'

export default function Penawaran() {
  const { user, hasPermission } = useAuth()
  const navigate = useNavigate()
  const isMarketing = hasPermission('kelola_penawaran')
  const isCustomer = user?.roles?.some(role => role.name === 'customer')

  const [penawarans, setPenawarans] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Form states (Marketing)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [customerId, setCustomerId] = useState('')
  const [produkId, setProdukId] = useState('')
  const [layananId, setLayananId] = useState('')
  const [judul, setJudul] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [brosur, setBrosur] = useState(null)
  const [brosurPreviewName, setBrosurPreviewName] = useState('')

  // Options for form
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])

  // Toast
  const [toast, setToast] = useState(null)
  const [showToast, setShowToast] = useState(false)

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const fetchPenawarans = () => {
    setLoading(true)
    api.get(`/penawaran?search=${search}&page=${page}`)
      .then(res => {
        setPenawarans(res.data.data || [])
        setTotalPages(res.data.last_page || 1)
      })
      .catch(err => {
        console.error(err)
        showToastMsg('Gagal memuat data penawaran.', 'error')
      })
      .finally(() => setLoading(false))
  }

  const fetchOptions = async () => {
    try {
      const custRes = await api.get('/users?limit=100')
      const activeCusts = (custRes.data.data || []).filter(u => u.roles?.some(r => r.name === 'customer'))
      setCustomers(activeCusts)

      const prodRes = await api.get('/public/produk?all=true')
      setProducts(prodRes.data || [])

      const servRes = await api.get('/public/layanan')
      const flatServices = []
      if (servRes.data && Array.isArray(servRes.data)) {
        servRes.data.forEach(kat => {
          if (kat.layanan && Array.isArray(kat.layanan)) {
            kat.layanan.forEach(l => {
              flatServices.push({
                id_layanan: l.id_layanan,
                title: l.title
              })
            })
          }
        })
      }
      console.log('Flat Services loaded:', flatServices)
      setServices(flatServices)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchPenawarans()
  }, [page, search])

  useEffect(() => {
    if (isMarketing) {
      fetchOptions()
    }
  }, [isMarketing])

  const openCreateModal = () => {
    setEditId(null)
    setCustomerId('')
    setProdukId('')
    setLayananId('')
    setJudul('')
    setDeskripsi('')
    setBrosur(null)
    setBrosurPreviewName('')
    setShowModal(true)
  }

  const openEditModal = (pen) => {
    setEditId(pen.id)
    setCustomerId(pen.customer_id)
    setProdukId(pen.produk_id || '')
    setLayananId(pen.layanan_id || '')
    setJudul(pen.judul)
    setDeskripsi(pen.deskripsi)
    setBrosur(null)
    setBrosurPreviewName(pen.brosur_path ? 'Brosur sudah terunggah' : '')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!customerId || !judul || !deskripsi) {
      showToastMsg('Harap isi semua kolom wajib.', 'error')
      return
    }
    if (!editId && !brosur) {
      showToastMsg('Harap unggah brosur penawaran.', 'error')
      return
    }

    const formData = new FormData()
    formData.append('customer_id', customerId)
    if (produkId) formData.append('produk_id', produkId)
    if (layananId) formData.append('layanan_id', layananId)
    formData.append('judul', judul)
    formData.append('deskripsi', deskripsi)
    if (brosur) {
      formData.append('brosur', brosur)
    }

    try {
      if (editId) {
        // Post spoofing Laravel
        await api.post(`/penawaran/${editId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        showToastMsg('Penawaran berhasil diperbarui.')
      } else {
        await api.post('/penawaran', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        showToastMsg('Penawaran baru berhasil dibuat.')
      }
      setShowModal(false)
      fetchPenawarans()
    } catch (err) {
      console.error(err)
      showToastMsg(err.response?.data?.message || 'Gagal menyimpan penawaran.', 'error')
    }
  }

  // "diterima" berarti customer setuju LANJUT KE PEMBAHASAN PROYEK (Sistem Negosiasi),
  // bukan menyetujui harga. Harga final ditentukan lewat negosiasi.
  const handleUpdateStatus = async (id, status) => {
    const pesanKonfirmasi = status === 'diterima'
      ? 'Lanjut ke pembahasan proyek?\n\nHarga pada penawaran ini masih perkiraan. Harga final akan ditentukan bersama marketing melalui negosiasi.'
      : 'Apakah Anda yakin ingin menolak penawaran ini?'
    if (!window.confirm(pesanKonfirmasi)) return
    try {
      const res = await api.put(`/penawaran/${id}/status`, { status })
      if (status === 'diterima' && res.data?.negosiasi?.id) {
        navigate(`/admin/negosiasi/${res.data.negosiasi.id}`)
        return
      }
      showToastMsg('Penawaran telah ditolak.')
      fetchPenawarans()
    } catch (err) {
      console.error(err)
      showToastMsg(err.response?.data?.message || 'Gagal memproses penawaran.', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus penawaran ini?')) return
    try {
      await api.delete(`/penawaran/${id}`)
      showToastMsg('Penawaran berhasil dihapus.')
      fetchPenawarans()
    } catch (err) {
      console.error(err)
      showToastMsg(err.response?.data?.message || 'Gagal menghapus penawaran.', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <Toast show={showToast && !!toast} type={toast?.type === 'error' ? 'error' : 'success'} message={toast?.msg} onClose={() => setShowToast(false)} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-secondary">Daftar Penawaran Harga</h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {isCustomer ? 'Tinjau proposal penawaran harga dari tim marketing kami.' : 'Kelola dan buat proposal penawaran untuk customer.'}
          </p>
        </div>
        {isMarketing && (
          <button 
            onClick={openCreateModal} 
            className="btn btn-primary btn-sm rounded-xl gap-2 px-4 text-white border-none shadow-sm font-semibold transition-all duration-200 hover:opacity-90 self-start sm:self-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Buat Penawaran</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          className="input input-bordered w-full text-sm rounded-xl focus:border-primary/50 focus:outline-none"
          placeholder="Cari berdasarkan judul atau deskripsi..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="card bg-base-100 rounded-3xl border border-base-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-sm">
            <thead>
              <tr className="bg-base-200/50 text-secondary border-b border-base-200">
                <th className="font-bold text-xs">Proposal / Judul</th>
                <th className="font-bold text-xs">Customer</th>
                <th className="font-bold text-xs text-center">Status</th>
                <th className="font-bold text-xs text-center">Dokumen</th>
                <th className="font-bold text-xs text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                  </td>
                </tr>
              ) : penawarans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-base-content/40 font-medium">Belum ada penawaran.</td>
                </tr>
              ) : (
                penawarans.map((pen) => (
                  <tr key={pen.id} className="hover:bg-base-100/50 transition-colors">
                    <td className="font-semibold text-secondary">
                      <div className="max-w-[200px] truncate" title={pen.judul}>{pen.judul}</div>
                      <div className="text-[10px] text-base-content/50 font-normal truncate max-w-[200px]">{pen.deskripsi}</div>
                    </td>
                    <td className="text-xs">{pen.customer?.name}</td>
                    <td className="text-center">
                      <span className={`badge ${
                        pen.status === 'diterima' ? 'bg-emerald-500 text-white' :
                        pen.status === 'ditolak' ? 'bg-rose-500 text-white' :
                        'bg-amber-500 text-white'
                      } border-0 font-semibold text-xs rounded-md px-2.5 py-1 uppercase`}>
                        {pen.status}
                      </span>
                    </td>
                    <td className="text-center">
                      {pen.brosur_path ? (
                        <a
                          href={`http://localhost:8000/storage/${pen.brosur_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10"
                        >
                          Brosur &darr;
                        </a>
                      ) : (
                        <span className="text-xs text-base-content/30">-</span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isCustomer && pen.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(pen.id, 'diterima')}
                              className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 border-none text-white font-bold rounded-lg px-3 shadow-sm"
                              title="Lanjut membahas kebutuhan dan harga proyek bersama marketing"
                            >
                              Lanjut ke Pembahasan
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(pen.id, 'ditolak')}
                              className="btn btn-xs bg-rose-600 hover:bg-rose-700 border-none text-white font-bold rounded-lg px-3 shadow-sm"
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        {isMarketing && (
                          <div className="flex gap-2 justify-center">
                            <button 
                              onClick={() => openEditModal(pen)} 
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-900/30 border border-amber-200/50 dark:border-amber-900/50 transition-all duration-200 hover:scale-105"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDelete(pen.id)} 
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/30 border border-rose-200/50 dark:border-rose-900/50 transition-all duration-200 hover:scale-105"
                              title="Hapus"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {pen.negosiasi && (
                          <Link
                            to={`/admin/negosiasi/${pen.negosiasi.id}`}
                            className="btn btn-xs btn-ghost text-primary font-bold hover:bg-primary/10"
                          >
                            Lihat Negosiasi &rarr;
                          </Link>
                        )}
                        {(!isMarketing && !pen.negosiasi && (!isCustomer || pen.status !== 'pending')) && (
                          <span className="text-xs text-base-content/40">-</span>
                        )}
                      </div>
                    </td>
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

      {showModal && (
        <div className="modal modal-open z-50">
          <div className="modal-box rounded-3xl max-w-lg border border-base-300 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg text-secondary border-b border-base-200 pb-3">
              {editId ? 'Edit Proposal Penawaran' : 'Buat Penawaran Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="form-control">
                <label className="label py-1"><span className="text-xs font-bold text-secondary">Customer <span className="text-error">*</span></span></label>
                <select
                  className="select select-bordered rounded-xl text-sm w-full"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">Pilih Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1"><span className="text-xs font-bold text-secondary">Produk Terkait (Opsional)</span></label>
                <select
                  className="select select-bordered rounded-xl text-sm w-full"
                  value={produkId}
                  onChange={(e) => setProdukId(e.target.value)}
                >
                  <option value="">Pilih Produk</option>
                  {products.map(p => (
                    <option key={p.id_produk} value={p.id_produk}>{p.nama}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1"><span className="text-xs font-bold text-secondary">Layanan Terkait (Opsional)</span></label>
                <select
                  className="select select-bordered rounded-xl text-sm w-full"
                  value={layananId}
                  onChange={(e) => setLayananId(e.target.value)}
                >
                  <option value="">Pilih Layanan</option>
                  {services.map(s => (
                    <option key={s.id_layanan} value={s.id_layanan}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1"><span className="text-xs font-bold text-secondary">Judul Penawaran <span className="text-error">*</span></span></label>
                <input
                  type="text"
                  className="input input-bordered rounded-xl text-sm w-full"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Pengembangan Web Kurva"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label py-1"><span className="text-xs font-bold text-secondary">Deskripsi & Ruang Lingkup <span className="text-error">*</span></span></label>
                <textarea
                  className="textarea textarea-bordered rounded-xl text-sm h-24 leading-relaxed"
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Tuliskan spesifikasi detail penawaran..."
                  required
                />
              </div>

              <div className="form-control">
                <label className="label py-1"><span className="text-xs font-bold text-secondary">Unggah Brosur / Proposal (PDF/Image) <span className="text-error">*</span></span></label>
                <input
                  type="file"
                  onChange={(e) => setBrosur(e.target.files[0])}
                  className="file-input file-input-bordered file-input-primary rounded-xl text-xs w-full"
                  required={!editId}
                />
                {brosurPreviewName && (
                  <p className="text-xs text-base-content/50 mt-1">{brosurPreviewName}</p>
                )}
              </div>

              <div className="modal-action border-t border-base-200 pt-4 flex gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline btn-sm rounded-xl px-4 font-bold">Batal</button>
                <button type="submit" className="btn btn-primary btn-sm rounded-xl px-4 text-white font-bold border-none">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
