import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/useAuth'
import AjukanProyek from './AjukanProyek'
import Toast from '../../components/Toast'
import { formatRupiah } from '../../utils/format'

// Tahapan yang hanya bisa dicapai setelah kesepakatan negosiasi (lihat ProyekController::cekTransisiStatus)
const STATUS_PASCA_KESEPAKATAN = ['Proses Pengerjaan', 'Selesai', 'Maintenance', 'Arsip']
const sudahDisepakati = (status) => STATUS_PASCA_KESEPAKATAN.includes(status)

export default function Proyek() {
  const { user, hasPermission } = useAuth()
  const navigate = useNavigate()
  const isMarketingOrAdmin = hasPermission('kelola_proyek')
  const isCustomer = user?.roles?.some(role => role.name === 'customer')

  const [proyeks, setProyeks] = useState([])
  const [activeProyek, setActiveProyek] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('list') // 'list', 'detail'
  const [showAjukanModal, setShowAjukanModal] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }))
    }, 4000)
  }

  // Admin/Marketing action states
  const [statusInput, setStatusInput] = useState('planning')
  const [tanggalMulaiInput, setTanggalMulaiInput] = useState('')
  const [tanggalSelesaiInput, setTanggalSelesaiInput] = useState('')
  const [isEditingKontrak, setIsEditingKontrak] = useState(false)
  
  // Validation modal state
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [alasanTolak, setAlasanTolak] = useState('')
  const [validating, setValidating] = useState(false)

  // Timeline management states
  const [newMilestoneJudul, setNewMilestoneJudul] = useState('')
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('')
  const [newMilestoneDate, setNewMilestoneDate] = useState('')
  const [newMilestoneSelesai, setNewMilestoneSelesai] = useState(false)
  const [isAddingMilestone, setIsAddingMilestone] = useState(false)

  // Dokumentasi upload states
  const [docFile, setDocFile] = useState(null)
  const [docKet, setDocKet] = useState('')
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const fetchProyeks = async (selectId = null) => {
    setLoading(true)
    try {
      const res = await api.get('/proyek')
      const data = res.data.data || []
      setProyeks(data)
      if (selectId) {
        const found = data.find(p => p.id === selectId)
        if (found) {
          setActiveProyek(found)
          setStatusInput(found.status_proyek)
          setTanggalMulaiInput(found.tanggal_mulai || '')
          setTanggalSelesaiInput(found.tanggal_selesai || '')
          setIsEditingKontrak(false)
          setIsAddingMilestone(false)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProyeks()
  }, [])

  const handleSelectProyek = (proj) => {
    setActiveProyek(proj)
    setStatusInput(proj.status_proyek)
    setTanggalMulaiInput(proj.tanggal_mulai || '')
    setTanggalSelesaiInput(proj.tanggal_selesai || '')
    setIsEditingKontrak(false)
    setIsAddingMilestone(false)
    setMode('detail')
  }

  // Helper status progress mapping
  const getProgressByStatus = (st) => {
    switch (st) {
      case 'pengajuan': return 0
      case 'ditolak': return 0
      case 'ditawarkan': return 30
      case 'negosiasi': return 20
      case 'Proses Pengerjaan': return 70
      case 'Selesai': return 90
      case 'Maintenance': return 95
      case 'Arsip': return 100
      // fallback legacy data lama
      case 'planning': return 25
      case 'on progress': return 70
      case 'testing': return 85
      case 'selesai': return 100
      case 'Ketertarikan': return 10
      case 'Ditindaklanjuti': return 25
      case 'Penawaran': return 40
      case 'Deal': return 50
      default: return 0
    }
  }

  // Handle update status tahapan via stepper.
  // Status manual hanya boleh berpindah di antara tahapan pasca-kesepakatan (sama dengan aturan backend).
  const handleUpdateStatusStepper = async (newStatus) => {
    if (!activeProyek) return

    if (!sudahDisepakati(activeProyek.status_proyek)) {
      showToast(
        activeProyek.status_proyek === 'negosiasi'
          ? 'Proyek sedang dinegosiasikan. Status berubah otomatis setelah kesepakatan tercapai di menu Negosiasi.'
          : activeProyek.status_proyek === 'pengajuan'
          ? 'Terima pengajuan terlebih dahulu untuk membuka sesi negosiasi.'
          : 'Status proyek ini tidak dapat diubah secara manual.',
        'error'
      )
      return
    }

    if (!sudahDisepakati(newStatus)) {
      showToast(`Proyek yang sudah disepakati tidak dapat dikembalikan ke "${newStatus}".`, 'error')
      return
    }

    const calculatedProgress = getProgressByStatus(newStatus)
    try {
      const res = await api.put(`/proyek/${activeProyek.id}`, {
        nama_proyek: activeProyek.nama_proyek,
        deskripsi_kebutuhan: activeProyek.deskripsi_kebutuhan,
        progress: calculatedProgress,
        status_proyek: newStatus,
        tanggal_mulai: tanggalMulaiInput,
        tanggal_selesai: tanggalSelesaiInput,
        timeline: activeProyek.timeline
      })
      showToast(`Status berhasil diubah menjadi "${newStatus}"`)
      setActiveProyek(res.data)
      setStatusInput(res.data.status_proyek)
      fetchProyeks(res.data.id)
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || 'Gagal memperbarui status tahapan.', 'error')
    }
  }

  // Update proyek progress & status & timeline
  const handleUpdateProyek = async (e) => {
    e.preventDefault()
    if (!activeProyek) return

    const calculatedProgress = getProgressByStatus(statusInput)

    try {
      const res = await api.put(`/proyek/${activeProyek.id}`, {
        nama_proyek: activeProyek.nama_proyek,
        deskripsi_kebutuhan: activeProyek.deskripsi_kebutuhan,
        progress: calculatedProgress,
        status_proyek: statusInput,
        tanggal_mulai: tanggalMulaiInput,
        tanggal_selesai: tanggalSelesaiInput,
        timeline: activeProyek.timeline // Mengirimkan timeline saat ini
      })
      showToast('Kontrak waktu proyek berhasil diperbarui!')
      setIsEditingKontrak(false)
      setActiveProyek(res.data)
      fetchProyeks(res.data.id)
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || 'Gagal memperbarui proyek.', 'error')
    }
  }

  // Handle validasi (Terima / Tolak Pengajuan). Terima → sesi negosiasi dibuka otomatis.
  const handleValidasi = async (aksi, alasan = '') => {
    if (!activeProyek) return
    setValidating(true)
    try {
      const res = await api.put(`/proyek/${activeProyek.id}/validasi`, { aksi, alasan_penolakan: alasan })
      setShowRejectModal(false)
      setAlasanTolak('')
      if (aksi === 'terima' && res.data.sesi_negosiasi?.id) {
        navigate(`/admin/negosiasi/${res.data.sesi_negosiasi.id}`)
        return
      }
      showToast(aksi === 'terima' ? 'Pengajuan diterima.' : 'Pengajuan proyek ditolak.', aksi === 'terima' ? 'success' : 'error')
      setActiveProyek(res.data)
      setStatusInput(res.data.status_proyek)
      fetchProyeks(res.data.id)
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || 'Gagal memproses validasi proyek.', 'error')
    } finally {
      setValidating(false)
    }
  }

  // Add timeline milestone
  const handleAddMilestone = async (e) => {
    e.preventDefault()
    if (!newMilestoneJudul || !newMilestoneDate) {
      showToast('Harap isi judul milestone dan tanggal.', 'error')
      return
    }

    const updatedTimeline = [...(activeProyek.timeline || [])]
    updatedTimeline.push({
      judul: newMilestoneJudul,
      deskripsi: newMilestoneDesc,
      tanggal: newMilestoneDate,
      selesai: newMilestoneSelesai
    })

    try {
      const res = await api.put(`/proyek/${activeProyek.id}`, {
        nama_proyek: activeProyek.nama_proyek,
        deskripsi_kebutuhan: activeProyek.deskripsi_kebutuhan,
        progress: activeProyek.progress,
        status_proyek: activeProyek.status_proyek,
        tanggal_mulai: activeProyek.tanggal_mulai,
        tanggal_selesai: activeProyek.tanggal_selesai,
        timeline: updatedTimeline
      })
      setActiveProyek(res.data)
      setNewMilestoneJudul('')
      setNewMilestoneDesc('')
      setNewMilestoneDate('')
      setNewMilestoneSelesai(false)
      setIsAddingMilestone(false)
      showToast('Milestone berhasil ditambahkan!')
      fetchProyeks(res.data.id)
    } catch (err) {
      console.error(err)
      showToast('Gagal menambah milestone.', 'error')
    }
  }

  // Toggle milestone status
  const handleToggleMilestone = async (index) => {
    const updatedTimeline = [...(activeProyek.timeline || [])]
    updatedTimeline[index].selesai = !updatedTimeline[index].selesai

    try {
      const res = await api.put(`/proyek/${activeProyek.id}`, {
        nama_proyek: activeProyek.nama_proyek,
        deskripsi_kebutuhan: activeProyek.deskripsi_kebutuhan,
        progress: activeProyek.progress,
        status_proyek: activeProyek.status_proyek,
        tanggal_mulai: activeProyek.tanggal_mulai,
        tanggal_selesai: activeProyek.tanggal_selesai,
        timeline: updatedTimeline
      })
      setActiveProyek(res.data)
      fetchProyeks(res.data.id)
    } catch (err) {
      console.error(err)
    }
  }

  // Remove milestone
  const handleRemoveMilestone = async (index) => {
    if (!window.confirm('Hapus milestone ini?')) return
    const updatedTimeline = [...(activeProyek.timeline || [])]
    updatedTimeline.splice(index, 1)

    try {
      const res = await api.put(`/proyek/${activeProyek.id}`, {
        nama_proyek: activeProyek.nama_proyek,
        deskripsi_kebutuhan: activeProyek.deskripsi_kebutuhan,
        progress: activeProyek.progress,
        status_proyek: activeProyek.status_proyek,
        tanggal_mulai: activeProyek.tanggal_mulai,
        tanggal_selesai: activeProyek.tanggal_selesai,
        timeline: updatedTimeline
      })
      setActiveProyek(res.data)
      fetchProyeks(res.data.id)
    } catch (err) {
      console.error(err)
    }
  }

  // Upload Dokumentasi / Berkas Hasil Proyek
  const handleUploadDokumentasi = async (e) => {
    e.preventDefault()
    if (!docFile || !docKet.trim()) return

    setUploadingDoc(true)
    const formData = new FormData()
    formData.append('file', docFile)
    formData.append('keterangan', docKet)

    try {
      const res = await api.post(`/proyek/${activeProyek.id}/dokumentasi`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setActiveProyek(res.data)
      setDocFile(null)
      setDocKet('')
      const fileInput = document.getElementById('doc-file-input')
      if (fileInput) fileInput.value = ''
      fetchProyeks(res.data.id)
      showToast('Dokumen pengerjaan berhasil diunggah!')
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || 'Gagal mengunggah berkas.', 'error')
    } finally {
      setUploadingDoc(false)
    }
  }

  // Delete Dokumentasi
  const handleDeleteDokumentasi = async (dokumenId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen hasil ini?')) return
    try {
      const res = await api.delete(`/proyek/${activeProyek.id}/dokumentasi/${dokumenId}`)
      setActiveProyek(res.data)
      fetchProyeks(res.data.id)
      showToast('Dokumen berhasil dihapus!')
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || 'Gagal menghapus berkas.', 'error')
    }
  }

  const handleDeleteProyek = async (id) => {
    if (!window.confirm('Hapus proyek ini secara permanen?')) return
    try {
      await api.delete(`/proyek/${id}`)
      setActiveProyek(null)
      setMode('list')
      fetchProyeks()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-secondary">
              {mode === 'detail' ? `Detail: ${activeProyek?.nama_proyek}` : 'Proyek Saya'}
            </h1>
            {mode === 'detail' && activeProyek?.customer && (
              <span className="badge badge-neutral bg-secondary text-white font-bold text-xs px-2.5 py-1 rounded-lg">
                Klien: {activeProyek.customer.name}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {mode === 'detail' 
              ? (activeProyek?.customer 
                  ? `Klien: ${activeProyek.customer.name} (${activeProyek.customer.email || 'Tanpa email'}) • Pantau progress jasa digital, tahapan, dan berkas.` 
                  : 'Pantau progress jasa digital Anda: tahapan, berkas hasil, dan catatan revisi.')
              : 'Daftar pengerjaan proyek sistem informasi dan konsultasi digital Anda.'}
          </p>
        </div>

        {mode === 'list' && isCustomer && (
          <button
            onClick={() => setShowAjukanModal(true)}
            className="btn btn-primary btn-sm rounded-xl gap-2 px-4 text-white border-none shadow-sm font-semibold transition-all duration-200 hover:opacity-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Ajukan Proyek</span>
          </button>
        )}

        {mode === 'detail' && (
          <button
            onClick={() => {
              setActiveProyek(null)
              setMode('list')
            }}
            className="btn btn-sm rounded-xl bg-white border border-[#DCE6E1] text-secondary hover:bg-base-100 hover:border-primary/40 font-semibold gap-2 px-4 shadow-xs transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Kembali ke Daftar</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : mode === 'list' ? (
        /* ════════════════════ LIST VIEW ════════════════════ */
        proyeks.length === 0 ? (
          <div className="card bg-base-100 border border-base-200 shadow-sm rounded-3xl p-12 text-center space-y-4 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-extrabold text-secondary">Belum ada proyek</h3>
            <p className="text-xs text-base-content/65 leading-relaxed max-w-xs mx-auto">
              Ajukan brief lewat formulir, lalu tim kami akan membuka ruang proyek untuk Anda.
            </p>
            {isCustomer && (
              <button
                onClick={() => setShowAjukanModal(true)}
                className="btn btn-primary btn-sm rounded-xl gap-2 px-4 text-white border-none shadow-sm font-semibold transition-all duration-200 hover:opacity-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Ajukan Proyek</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {proyeks.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleSelectProyek(proj)}
                className="group card bg-base-100 border border-base-200 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer rounded-3xl p-5 flex flex-col justify-between h-56 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[10px] font-bold text-primary uppercase">
                      {proj.layanan?.title || 'Kustom TI'}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                      proj.status_proyek === 'selesai' || proj.status_proyek === 'Selesai' ? 'bg-emerald-100 text-emerald-700' :
                      proj.status_proyek === 'pengajuan' ? 'bg-amber-100 text-amber-700' :
                      proj.status_proyek === 'ditolak' ? 'bg-rose-100 text-rose-700' :
                      proj.status_proyek === 'ditawarkan' ? 'bg-blue-100 text-blue-700' :
                      proj.status_proyek === 'negosiasi' ? 'bg-purple-100 text-purple-700' :
                      proj.status_proyek === 'Proses Pengerjaan' ? 'bg-indigo-100 text-indigo-700' :
                      proj.status_proyek === 'Maintenance' ? 'bg-teal-100 text-teal-700' :
                      proj.status_proyek === 'Arsip' ? 'bg-slate-200 text-slate-700' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {proj.status_proyek}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-secondary group-hover:text-primary transition-colors text-sm line-clamp-2 leading-snug">
                    {proj.nama_proyek}
                  </h3>
                  {proj.harga_kontrak && (
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60 w-fit">
                      <span className="text-[9px] font-bold text-emerald-600/70 uppercase">Nilai Kontrak:</span>
                      <span>{formatRupiah(proj.harga_kontrak)}</span>
                    </div>
                  )}
                  {isMarketingOrAdmin && proj.customer && (
                    <p className="text-[10px] font-semibold text-primary/80">
                      Klien: {proj.customer.name}
                    </p>
                  )}
                  <p className="text-[11px] text-base-content/60 line-clamp-3 leading-relaxed">
                    {proj.deskripsi_kebutuhan}
                  </p>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-base-200">
                  <div className="flex justify-between items-center text-[10px] font-bold text-base-content/50">
                    <span>Progress Pengerjaan</span>
                    <span className="text-secondary font-mono">{proj.progress}%</span>
                  </div>
                  <progress
                    className="progress progress-primary w-full h-1.5"
                    value={proj.progress}
                    max="100"
                  ></progress>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ════════════════════ DETAIL VIEW ════════════════════ */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: MONITORING PROGRESS & TIMELINE */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Progress Card */}
            <div className="card bg-base-100 border border-base-200 p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-primary uppercase">
                    {activeProyek.layanan?.title || 'Pengembangan Custom'}
                  </span>
                  <h2 className="font-extrabold text-secondary text-base sm:text-lg leading-tight mt-0.5">
                    Track Record Progres Customer / Lead
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
                    activeProyek.status_proyek === 'selesai' || activeProyek.status_proyek === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                    activeProyek.status_proyek === 'pengajuan' ? 'bg-amber-100 text-amber-700' :
                    activeProyek.status_proyek === 'ditolak' ? 'bg-rose-100 text-rose-700' :
                    activeProyek.status_proyek === 'ditawarkan' ? 'bg-blue-100 text-blue-700' :
                    activeProyek.status_proyek === 'negosiasi' ? 'bg-purple-100 text-purple-700' :
                    activeProyek.status_proyek === 'Proses Pengerjaan' ? 'bg-indigo-100 text-indigo-700' :
                    activeProyek.status_proyek === 'Maintenance' ? 'bg-teal-100 text-teal-700' :
                    activeProyek.status_proyek === 'Arsip' ? 'bg-slate-200 text-slate-700' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {activeProyek.status_proyek}
                  </span>

                  {/* Dropdown Ubah Status Terintegrasi pada Header Stepper (Marketing & Admin) */}
                  {isMarketingOrAdmin && sudahDisepakati(activeProyek.status_proyek) && (
                    <div className="dropdown dropdown-end">
                      <div tabIndex={0} role="button" className="btn btn-xs rounded-full border px-3 text-[10px] font-bold h-7 flex items-center gap-1.5 shadow-xs bg-white hover:bg-base-100 border-base-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Ubah Status</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <ul tabIndex={0} className="dropdown-content menu p-2 shadow-xl bg-base-100 rounded-2xl w-56 border border-base-200 mt-1 z-[100] space-y-1">
                        <li className="menu-title px-2.5 py-1 text-[9px] font-extrabold uppercase text-base-content/40">
                          Pilih Tahapan Progres
                        </li>
                        {STATUS_PASCA_KESEPAKATAN.map((st) => (
                          <li key={st}>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatusStepper(st)}
                              className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-bold ${
                                activeProyek.status_proyek === st ? 'bg-primary/10 text-primary' : 'hover:bg-base-100'
                              }`}
                            >
                              <span>{st}</span>
                              {activeProyek.status_proyek === st && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Stepper Bulat-bulat Track Record Progres */}
              {(() => {
                // POV Customer: 4 tahapan ringkas: Deal -> Proses Pengerjaan -> Selesai -> Maintenance
                // POV Marketing/Admin: 5 tahapan proyek: pengajuan -> Proses Pengerjaan -> Selesai -> Maintenance -> Arsip
                const marketingStages = ['pengajuan', 'negosiasi', 'Proses Pengerjaan', 'Selesai', 'Maintenance', 'Arsip'];
                const customerStages = ['Deal', 'Proses Pengerjaan', 'Selesai', 'Maintenance'];

                const stages = isCustomer ? customerStages : marketingStages;

                let norm = activeProyek.status_proyek;
                if (norm === 'planning') norm = 'Proses Pengerjaan';
                else if (norm === 'on progress' || norm === 'testing') norm = 'Proses Pengerjaan';
                else if (norm === 'selesai') norm = 'Selesai';
                
                // Jika customer, status proyek sebelum Deal tidak relevan — default ke Deal
                if (isCustomer && ['Ketertarikan', 'Ditindaklanjuti', 'Penawaran', 'pengajuan', 'ditolak', 'negosiasi'].includes(norm)) {
                  norm = 'Deal';
                }

                const curIdx = stages.indexOf(norm);
                const isUnderReview = activeProyek.status_proyek === 'pengajuan';
                const isRejected = activeProyek.status_proyek === 'ditolak';

                return (
                  <div className="w-full py-2 relative px-2 overflow-x-auto custom-scrollbar">
                    <div className={`${isCustomer ? 'min-w-[420px] max-w-2xl mx-auto' : 'min-w-[700px]'} relative py-4`}>
                      {/* Line background */}
                      <div className="absolute top-[28px] left-10 right-10 h-[3px] bg-base-300 rounded-full z-0">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                          style={{ 
                            width: isUnderReview || isRejected || curIdx < 0 ? '0%' : `${(Math.max(0, curIdx) / (stages.length - 1)) * 100}%` 
                          }}
                        />
                      </div>
                      
                      {/* Dots Stepper */}
                      <div className="relative z-10 flex justify-between items-start w-full">
                        {stages.map((st, idx) => {
                          const active = !isUnderReview && !isRejected && curIdx >= 0 && idx <= curIdx;
                          const isCurrent = !isUnderReview && !isRejected && idx === curIdx;
                          const bisaDiklik = isMarketingOrAdmin && sudahDisepakati(activeProyek.status_proyek) && sudahDisepakati(st);

                          return (
                            <button
                              key={st}
                              type="button"
                              disabled={!bisaDiklik}
                              onClick={() => {
                                if (bisaDiklik && activeProyek.status_proyek !== st) {
                                  handleUpdateStatusStepper(st)
                                }
                              }}
                              title={bisaDiklik ? `Klik untuk ubah tahapan ke "${st}"` : st}
                              className={`flex flex-col items-center gap-2 group/dot relative w-24 transition-all focus:outline-none ${
                                bisaDiklik ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'
                              }`}
                            >
                              <div 
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shadow-xs shrink-0 ${
                                  active 
                                    ? 'bg-emerald-500 text-white scale-110 ring-4 ring-emerald-500/20'
                                    : bisaDiklik
                                    ? 'bg-white text-base-content/40 border-2 border-base-300 group-hover/dot:border-primary group-hover/dot:text-primary group-hover/dot:shadow-sm'
                                    : 'bg-white text-base-content/30 border-2 border-base-300'
                                }`}
                              >
                                {active ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-base-300 group-hover/dot:bg-primary" />
                                )}
                              </div>
                              <span 
                                className={`text-[10px] font-bold tracking-tight text-center w-full leading-tight select-none mt-1 transition-colors ${
                                  isCurrent 
                                    ? 'text-emerald-600 font-extrabold' 
                                    : isMarketingOrAdmin
                                    ? 'text-base-content/50 group-hover/dot:text-primary font-semibold'
                                    : 'text-base-content/40'
                                }`}
                              >
                                {st}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {isMarketingOrAdmin && (
                      <p className="text-[10px] text-base-content/40 italic text-center select-none pt-1">
                        {sudahDisepakati(activeProyek.status_proyek)
                          ? 'Tip: Klik bulatan tahapan pada alur di atas atau gunakan tombol "Ubah Status" untuk memperbarui progres proyek.'
                          : 'Tahap pengajuan & negosiasi berjalan lewat validasi pengajuan dan menu Negosiasi. Ubah status manual tersedia setelah kesepakatan tercapai.'}
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="text-xs text-base-content/75 leading-relaxed bg-base-50 p-4 rounded-2xl border border-base-200/55">
                <p className="font-bold text-secondary mb-1">Brief Kebutuhan:</p>
                <p className="whitespace-pre-wrap">{activeProyek.deskripsi_kebutuhan}</p>
              </div>

              {/* Catatan jika ditolak */}
              {activeProyek.status_proyek === 'ditolak' && activeProyek.alasan_penolakan && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span>Pengajuan Proyek Ini Ditolak</span>
                  </div>
                  <p className="opacity-90">{activeProyek.alasan_penolakan}</p>
                </div>
              )}

              {/* Kontrak Waktu & Nilai Proyek */}
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-3">
                <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                  <span className="text-[11px] font-extrabold text-secondary tracking-wide uppercase">
                    Informasi Kontrak &amp; Jadwal Proyek
                  </span>
                  {isMarketingOrAdmin && (activeProyek.tanggal_mulai || activeProyek.tanggal_selesai) && (
                    <button 
                      onClick={() => setIsEditingKontrak(!isEditingKontrak)}
                      className="btn btn-xs rounded-xl bg-white border border-[#DCE6E1] hover:border-primary/40 hover:bg-primary/5 text-primary text-xs font-semibold px-3 h-7 shadow-xs transition-all"
                    >
                      {isEditingKontrak ? 'Batal' : 'Edit Kontrak'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-base-content/40 uppercase">Tanggal Mulai Proyek</p>
                    <p className="text-sm font-bold text-secondary mt-0.5">
                      {activeProyek.tanggal_mulai 
                        ? new Date(activeProyek.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'Belum ditentukan'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-base-content/40 uppercase">Target Serah Terima</p>
                    <p className="text-sm font-bold text-secondary mt-0.5">
                      {activeProyek.tanggal_selesai 
                        ? new Date(activeProyek.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'Belum ditentukan'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-base-content/40 uppercase">Nilai Kontrak Proyek</p>
                    <p className="text-sm font-extrabold text-emerald-700 mt-0.5">
                      {activeProyek.harga_kontrak ? formatRupiah(activeProyek.harga_kontrak) : 'Belum ditentukan'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Kontrak Waktu Proyek (Khusus Marketing/Admin saat belum diatur atau mode edit) */}
              {isMarketingOrAdmin && (!activeProyek.tanggal_mulai || !activeProyek.tanggal_selesai || isEditingKontrak) && (
                <form onSubmit={handleUpdateProyek} className="bg-base-200/40 p-4 rounded-2xl border border-base-300 flex flex-col gap-3">
                  <h4 className="font-bold text-xs text-secondary flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Atur Kontrak Waktu Proyek
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label py-0.5"><span className="label-text text-[10px] font-bold text-secondary">Tanggal Mulai</span></label>
                      <input 
                        type="date" 
                        className="input input-bordered rounded-xl text-xs w-full focus:outline-none bg-white"
                        value={tanggalMulaiInput}
                        onChange={(e) => setTanggalMulaiInput(e.target.value)}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label py-0.5"><span className="label-text text-[10px] font-bold text-secondary">Tanggal Target Selesai</span></label>
                      <input 
                        type="date" 
                        className="input input-bordered rounded-xl text-xs w-full focus:outline-none bg-white"
                        value={tanggalSelesaiInput}
                        onChange={(e) => setTanggalSelesaiInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-1">
                    <button 
                      type="submit" 
                      className="btn btn-primary btn-sm rounded-xl text-white font-semibold border-none shadow-sm gap-1.5 px-4 transition-all hover:opacity-90"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Simpan Kontrak Waktu</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ── CARD PANEL AKSI & NEGOSIASI HARGA PROYEK ── */}
              {activeProyek.status_proyek === 'pengajuan' ? (
                isMarketingOrAdmin ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-base-50/80 border border-base-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-xs sm:text-sm text-secondary">Validasi Pengajuan Proyek</h4>
                          <span className="badge badge-xs bg-amber-100 text-amber-800 border-amber-200 font-bold text-[9px] uppercase px-2 py-0.5">
                            Menunggu Review
                          </span>
                        </div>
                        <p className="text-[11px] text-base-content/60 leading-tight">
                          Proyek dari <span className="font-bold text-secondary">{activeProyek.customer?.name || 'Customer'}</span>. Terima untuk membuka sesi negosiasi (kebutuhan, rancangan &amp; harga).
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={validating}
                        onClick={() => setShowRejectModal(true)}
                        className="btn btn-xs sm:btn-sm btn-ghost hover:bg-rose-50 text-rose-600 rounded-xl px-3 font-bold text-xs gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Tolak</span>
                      </button>
                      <button
                        type="button"
                        disabled={validating}
                        onClick={() => handleValidasi('terima')}
                        className="btn btn-xs sm:btn-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none rounded-xl px-4 font-bold text-xs shadow-2xs gap-1.5"
                      >
                        {validating ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span>Terima &amp; Buka Negosiasi</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 rounded-2xl bg-base-50/80 border border-base-200/90 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-xs sm:text-sm text-secondary">Pengajuan Sedang Ditinjau</h4>
                        <span className="badge badge-xs bg-amber-100 text-amber-800 border-amber-200 font-bold text-[9px] uppercase px-2 py-0.5">
                          Menunggu Marketing
                        </span>
                      </div>
                      <p className="text-[11px] text-base-content/60">
                        Brief proyek telah diterima. Tim marketing sedang meninjau kebutuhan teknis dan segera memberikan penawaran harga.
                      </p>
                    </div>
                  </div>
                )
              ) : activeProyek.status_proyek === 'negosiasi' ? (
                /* ── PANEL NEGOSIASI → modul Sesi Negosiasi ── */
                <div className="p-4 sm:p-5 rounded-2xl bg-base-50/80 border border-base-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-extrabold text-xs sm:text-sm text-secondary">Sesi Negosiasi Berlangsung</h4>
                        {activeProyek.sesi_negosiasi && (
                          <span className="badge badge-xs bg-purple-100 text-purple-700 border-purple-200 font-bold text-[9px] uppercase px-2 py-0.5">
                            Tahap {activeProyek.sesi_negosiasi.tahap}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-base-content/60">
                        {activeProyek.sesi_negosiasi?.menunggu_respons_dari === (isCustomer ? 'customer' : 'marketing')
                          ? 'Ada langkah yang menunggu tanggapan Anda.'
                          : 'Kebutuhan, rancangan, dan penawaran harga dibahas di halaman sesi negosiasi.'}
                      </p>
                    </div>
                  </div>
                  {activeProyek.sesi_negosiasi && (
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/negosiasi/${activeProyek.sesi_negosiasi.id}`)}
                      className="btn btn-xs sm:btn-sm bg-primary hover:opacity-90 text-white border-none rounded-xl px-4 font-bold text-xs shadow-2xs gap-1.5 shrink-0"
                    >
                      <span>Buka Sesi Negosiasi</span>
                    </button>
                  )}
                </div>
              ) : activeProyek.status_proyek === 'ditolak' ? (
                <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-rose-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="font-semibold">Status proyek ini ditolak. Alur kerja tidak dapat dilanjutkan kecuali status diubah kembali.</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Timeline Milestone Card */}
            <div className="card bg-base-100 border border-base-200 p-6 rounded-3xl space-y-5 shadow-sm">
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <h3 className="font-extrabold text-secondary text-sm sm:text-base">
                  Timeline & Milestone Proyek
                </h3>
                {isMarketingOrAdmin && (
                  <button
                    onClick={() => setIsAddingMilestone(!isAddingMilestone)}
                    className="btn btn-primary btn-sm rounded-xl gap-1.5 px-3.5 text-white border-none shadow-sm font-semibold transition-all hover:opacity-90"
                  >
                    {isAddingMilestone ? (
                      <span>Batal</span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Tambah Milestone</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-4 pl-2">
                {(!activeProyek.timeline || activeProyek.timeline.length === 0) ? (
                  <p className="text-xs text-base-content/40 italic">Timeline pengerjaan belum ditambahkan.</p>
                ) : (
                  activeProyek.timeline.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-start relative group">
                      {/* Line connector */}
                      {idx !== activeProyek.timeline.length - 1 && (
                        <div className="absolute left-[11px] top-7 w-[2px] h-[calc(100%+8px)] bg-base-200"></div>
                      )}

                      <div
                        onClick={() => { if (isMarketingOrAdmin) handleToggleMilestone(idx); }}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                          item.selesai
                            ? 'bg-primary border-primary text-white shadow-sm shadow-primary/20'
                            : 'bg-white border-base-300'
                        }`}
                      >
                        {item.selesai && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-secondary truncate">{item.judul}</h4>
                          <span className="text-[10px] text-base-content/40 font-mono shrink-0">
                            {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-base-content/60 leading-relaxed mt-0.5">{item.deskripsi}</p>
                        {isMarketingOrAdmin && (
                          <button
                            onClick={() => handleRemoveMilestone(idx)}
                            className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700 hover:underline mt-1.5 font-semibold transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Hapus Milestone</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {isMarketingOrAdmin && isAddingMilestone && (
                <form onSubmit={handleAddMilestone} className="pt-5 border-t border-base-200 space-y-4 bg-[#fbfdfc] p-5 rounded-2xl border border-primary/10">
                  <h4 className="font-bold text-xs text-secondary flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tambah Milestone Baru
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label py-0.5"><span className="label-text text-[10px] font-bold text-secondary">Judul Milestone <span className="text-error">*</span></span></label>
                      <input
                        type="text"
                        placeholder="Contoh: Desain Figma Disetujui"
                        className="input input-bordered rounded-xl text-xs w-full focus:outline-none bg-base-100 border-base-200"
                        value={newMilestoneJudul}
                        onChange={(e) => setNewMilestoneJudul(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label py-0.5"><span className="label-text text-[10px] font-bold text-secondary">Tanggal Target <span className="text-error">*</span></span></label>
                      <input
                        type="date"
                        className="input input-bordered rounded-xl text-xs w-full focus:outline-none bg-base-100 border-base-200"
                        value={newMilestoneDate}
                        onChange={(e) => setNewMilestoneDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label py-0.5"><span className="label-text text-[10px] font-bold text-secondary">Keterangan / Catatan</span></label>
                    <textarea
                      placeholder="Detail mengenai target milestone..."
                      className="textarea textarea-bordered rounded-xl text-xs h-20 leading-relaxed focus:outline-none bg-base-100 border-base-200"
                      value={newMilestoneDesc}
                      onChange={(e) => setNewMilestoneDesc(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-secondary">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm rounded"
                        checked={newMilestoneSelesai}
                        onChange={(e) => setNewMilestoneSelesai(e.target.checked)}
                      />
                      Langsung tandai selesai
                    </label>

                    <button 
                      type="submit" 
                      className="btn btn-primary btn-sm rounded-xl text-white font-semibold border-none shadow-sm gap-1.5 px-4 transition-all hover:opacity-90"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Simpan Milestone</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* RIGHT: DOKUMENTASI / BERKAS HASIL */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Dokumentasi List */}
            <div className="card bg-base-100 border border-base-200 p-6 rounded-3xl space-y-4 shadow-sm">
              <h3 className="font-extrabold text-secondary text-sm border-b border-base-200 pb-3">
                Dokumentasi & Lampiran
              </h3>

              <div className="space-y-3">
                {(!activeProyek.dokumentasi || activeProyek.dokumentasi.length === 0) ? (
                  <div className="text-center py-6 text-base-content/40 space-y-1">
                    <p className="text-[11px] font-bold">Belum ada berkas</p>
                    <p className="text-[10px] leading-relaxed">Hasil pengerjaan / SkPL akan diunggah di sini.</p>
                  </div>
                ) : (
                  activeProyek.dokumentasi.map((doc) => (
                    <div key={doc.id} className="p-3 bg-base-50 border border-base-200/50 rounded-2xl flex flex-col gap-1.5 shadow-[0_1px_5px_rgba(0,0,0,0.01)]">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-secondary truncate" title={doc.file_name}>
                            {doc.file_name}
                          </p>
                          <p className="text-[9px] text-base-content/50 mt-0.5 font-medium leading-relaxed">
                            {doc.keterangan}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-base-content/40 border-t border-base-200/40 pt-2 mt-1">
                        <span>{new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        <div className="flex items-center gap-2 font-bold">
                          {isMarketingOrAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDokumentasi(doc.id)}
                              className="text-error hover:underline"
                            >
                              Hapus
                            </button>
                          )}
                          <a
                            href={`http://localhost:8000/storage/${doc.file_path}`}
                            download={doc.file_name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Download &rarr;
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {isMarketingOrAdmin && (
                <form onSubmit={handleUploadDokumentasi} className="pt-4 border-t border-base-200 space-y-3">
                  <h4 className="font-bold text-xs text-secondary">Unggah Berkas Baru</h4>
                  <div className="form-control">
                    <input
                      type="file"
                      id="doc-file-input"
                      onChange={(e) => setDocFile(e.target.files[0])}
                      className="file-input file-input-bordered file-input-primary file-input-xs rounded-xl w-full text-[11px]"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <input
                      type="text"
                      placeholder="Keterangan berkas..."
                      className="input input-bordered input-xs rounded-xl text-xs w-full focus:outline-none"
                      value={docKet}
                      onChange={(e) => setDocKet(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingDoc || !docFile || !docKet.trim()}
                    className="btn btn-primary btn-sm w-full text-white font-semibold rounded-xl border-none shadow-sm gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {uploadingDoc ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Unggah Berkas</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Admin Delete Proyek */}
            {isMarketingOrAdmin && (
              <button
                onClick={() => handleDeleteProyek(activeProyek.id)}
                className="btn btn-sm w-full mt-4 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/30 border border-rose-200/80 hover:border-rose-300 font-semibold rounded-xl justify-center gap-2 transition-all duration-200 shadow-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Hapus Proyek Secara Permanen</span>
              </button>
            )}

          </div>

        </div>
      )}

      {/* ── POPUP MODAL: AJUKAN PROYEK (CUSTOMER) ── */}
      <AjukanProyek
        isOpen={showAjukanModal}
        onClose={() => setShowAjukanModal(false)}
        onSaved={() => {
          setShowAjukanModal(false)
          fetchProyeks()
          showToast('Pengajuan proyek berhasil dikirim! Tim kami akan segera meninjau.')
        }}
      />

      {/* ── MODAL: ALASAN PENOLAKAN PROYEK ── */}
      {showRejectModal && (
        <div className="modal modal-open z-50">
          <div className="modal-box rounded-3xl max-w-md border border-base-300">
            <h3 className="font-extrabold text-base text-secondary border-b border-base-200 pb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Tolak Pengajuan Proyek</span>
            </h3>
            <div className="space-y-3 pt-3">
              <p className="text-xs text-base-content/70">
                Berikan catatan alasan mengapa pengajuan proyek ini belum dapat diterima. Catatan ini akan dapat dibaca oleh klien.
              </p>
              <textarea
                className="textarea textarea-bordered rounded-xl text-xs w-full h-24 focus:outline-none focus:border-rose-400"
                placeholder="Contoh: Kebutuhan teknis belum lengkap, mohon konsultasi terlebih dahulu melalui fitur chat..."
                value={alasanTolak}
                onChange={(e) => setAlasanTolak(e.target.value)}
              />
            </div>
            <div className="modal-action border-t border-base-200 pt-3 flex justify-end gap-2">
              <button
                type="button"
                disabled={validating}
                onClick={() => {
                  setShowRejectModal(false)
                  setAlasanTolak('')
                }}
                className="btn btn-sm btn-ghost rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={validating}
                onClick={() => handleValidasi('tolak', alasanTolak)}
                className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold border-none"
              >
                {validating ? <span className="loading loading-spinner loading-xs"></span> : null}
                <span>Konfirmasi Tolak</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: INPUT HARGA KONTRAK (MARKETING) ── */}
      <Toast show={toast.show} type={toast.type === 'success' ? 'success' : 'error'} message={toast.message} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
    </div>
  )
}
