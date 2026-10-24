import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/useAuth'
import Toast from '../../components/Toast'
import {
  LABEL_TAHAP, LABEL_STATUS, WARNA_STATUS, LANGKAH,
  indeksLangkah, formatTanggal, formatRupiah,
} from './negosiasiLabel'

/**
 * Halaman detail satu negosiasi.
 * Isi panel aksi bergantung pada dua hal: siapa yang membuka (marketing/customer)
 * dan tahap negosiasi saat ini. Aturan yang sama juga dijaga di backend,
 * jadi tombol yang disembunyikan di sini tetap ditolak server kalau dipanggil paksa.
 */
export default function NegosiasiDetail() {
  const { id } = useParams()
  const { user, hasPermission } = useAuth()
  const isCustomer = user?.roles?.some((role) => role.name === 'customer')
  const isMarketing = hasPermission('kelola_negosiasi')

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMuat, setErrorMuat] = useState('')
  const [mengirim, setMengirim] = useState(false)
  const [toast, setToast] = useState(null)

  const muat = useCallback(() => {
    setLoading(true)
    api.get(`/negosiasi/${id}`)
      .then((res) => { setData(res.data); setErrorMuat('') })
      .catch((err) => setErrorMuat(err.response?.data?.message || 'Gagal memuat negosiasi.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { muat() }, [muat])

  // Kirim aksi ke server, tampilkan pesan, lalu pakai data terbaru dari respons.
  const jalankan = async (permintaan, pesanBerhasil) => {
    setMengirim(true)
    try {
      const res = await permintaan()
      setData(res.data)
      setToast({ type: 'success', msg: pesanBerhasil })
      return true
    } catch (err) {
      console.error(err)
      setToast({ type: 'error', msg: err.response?.data?.message || 'Terjadi kesalahan.' })
      if (err.response?.status === 409) muat() // tahap sudah berubah: muat ulang
      return false
    } finally {
      setMengirim(false)
    }
  }

  const putaran = useMemo(() => {
    const kelompok = {}
    for (const p of data?.pertanyaan_kebutuhans || []) {
      if (!kelompok[p.putaran]) kelompok[p.putaran] = []
      kelompok[p.putaran].push(p)
    }
    return Object.entries(kelompok)
      .map(([nomor, daftar]) => ({ nomor: Number(nomor), daftar }))
      .sort((a, b) => a.nomor - b.nomor)
  }, [data])

  if (loading && !data) {
    return <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg text-primary"></span></div>
  }

  if (errorMuat) {
    return (
      <div className="space-y-4">
        <Link to="/admin/negosiasi" className="btn btn-ghost btn-sm rounded-xl">&larr; Kembali</Link>
        <div className="alert alert-error rounded-2xl text-sm">{errorMuat}</div>
      </div>
    )
  }

  const aktif = data.status === 'aktif'
  const posisi = indeksLangkah(data.tahap)
  const putaranBerjalan = putaran.find((p) => p.nomor === data.putaran_pertanyaan)

  return (
    <div className="space-y-6">
      <Toast show={!!toast} type={toast?.type} message={toast?.msg} onClose={() => setToast(null)} />

      {/* Judul */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/admin/negosiasi" className="text-xs font-semibold text-primary hover:underline">&larr; Semua negosiasi</Link>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-secondary mt-1">
            {data.penawaran?.judul || `Negosiasi #${data.id}`}
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Tahap saat ini: <span className="font-semibold text-base-content/80">{LABEL_TAHAP[data.tahap] || data.tahap}</span>
          </p>
        </div>
        <span className={`badge ${WARNA_STATUS[data.status] || ''} border-0 font-semibold text-xs rounded-md px-3 py-2 self-start`}>
          {LABEL_STATUS[data.status] || data.status}
        </span>
      </div>

      {/* Langkah besar negosiasi */}
      <ul className="steps steps-horizontal w-full text-xs">
        {LANGKAH.map((l, i) => (
          <li key={l.kunci} className={`step ${i <= posisi ? 'step-primary' : ''}`}>{l.label}</li>
        ))}
      </ul>

      {!aktif && (
        <div className={`alert ${data.status === 'berhasil' ? 'alert-success' : 'alert-warning'} rounded-2xl text-sm`}>
          <div>
            <p className="font-bold">Negosiasi {LABEL_STATUS[data.status]?.toLowerCase()} pada {formatTanggal(data.ditutup_at)}</p>
            {data.alasan_penutupan && <p className="mt-1">Alasan: {data.alasan_penutupan}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom kiri: riwayat pertanyaan dan jawaban */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-secondary">Pertanyaan &amp; Jawaban Kebutuhan</h2>
          {putaran.length === 0 ? (
            <div className="card bg-base-100 rounded-3xl border border-base-200 p-6 text-sm text-base-content/50">
              Belum ada pertanyaan yang dikirim.
            </div>
          ) : (
            putaran.map((p) => (
              <div key={p.nomor} className="card bg-base-100 rounded-3xl border border-base-200 shadow-sm p-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-base-content/50">Putaran {p.nomor}</p>
                {p.daftar.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <p className="text-sm font-semibold text-secondary">{q.urutan}. {q.isi_pertanyaan}</p>
                    {q.jawaban ? (
                      <p className="text-sm bg-base-200/60 rounded-xl px-3 py-2 whitespace-pre-line">{q.jawaban.isi_jawaban}</p>
                    ) : (
                      <p className="text-xs italic text-base-content/40">Belum dijawab</p>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Kolom kanan: info dan aksi */}
        <div className="space-y-4">
          <div className="card bg-base-100 rounded-3xl border border-base-200 shadow-sm p-5 text-sm space-y-2">
            <Info label="Customer" nilai={data.customer?.name} />
            <Info label="Marketing" nilai={data.marketing?.name} />
            <Info label="Harga awal (perkiraan)" nilai={formatRupiah(data.penawaran?.harga)} />
            {data.batas_respons && <Info label="Batas respons" nilai={formatTanggal(data.batas_respons)} tegas />}
          </div>

          {aktif && (
            <PanelAksi
              data={data}
              isCustomer={isCustomer}
              isMarketing={isMarketing}
              putaranBerjalan={putaranBerjalan}
              mengirim={mengirim}
              jalankan={jalankan}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function Info({ label, nilai, tegas }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-base-content/50">{label}</span>
      <span className={`text-right ${tegas ? 'font-bold text-amber-600' : 'font-semibold'}`}>{nilai || '-'}</span>
    </div>
  )
}

/** Memilih panel yang sesuai peran dan tahap. */
function PanelAksi({ data, isCustomer, isMarketing, putaranBerjalan, mengirim, jalankan }) {
  const { tahap } = data

  return (
    <div className="space-y-4">
      {isMarketing && (tahap === 'menyusun_pertanyaan' || tahap === 'peninjauan_jawaban') && (
        <FormPertanyaan data={data} mengirim={mengirim} jalankan={jalankan} />
      )}

      {isMarketing && tahap === 'peninjauan_jawaban' && (
        <KartuAksi judul="Kebutuhan sudah lengkap?">
          <p className="text-xs text-base-content/60">
            Kalau jawaban customer sudah cukup untuk menyusun ruang lingkup, deliverable, timeline, dan biaya, lanjutkan ke tahap rancangan proyek.
          </p>
          <button
            className="btn btn-success btn-sm rounded-xl text-white w-full"
            disabled={mengirim}
            onClick={() => {
              if (!window.confirm('Tandai kebutuhan sudah lengkap? Customer tidak akan ditanya lagi.')) return
              jalankan(() => api.post(`/negosiasi/${data.id}/kebutuhan-lengkap`), 'Kebutuhan ditandai lengkap.')
            }}
          >
            Kebutuhan Lengkap, Lanjut ke Rancangan
          </button>
        </KartuAksi>
      )}

      {isCustomer && tahap === 'menunggu_jawaban' && putaranBerjalan && (
        <FormJawaban data={data} daftar={putaranBerjalan.daftar} mengirim={mengirim} jalankan={jalankan} />
      )}

      {/* Pesan menunggu */}
      {isMarketing && tahap === 'menunggu_jawaban' && (
        <Menunggu teks="Menunggu customer menjawab pertanyaan." />
      )}
      {isCustomer && tahap === 'menyusun_pertanyaan' && (
        <Menunggu teks="Marketing sedang menyiapkan pertanyaan tentang kebutuhan proyek Anda." />
      )}
      {isCustomer && tahap === 'peninjauan_jawaban' && (
        <Menunggu teks="Jawaban Anda sedang ditinjau oleh marketing." />
      )}
      {tahap === 'rancangan_proyek' && (
        <Menunggu teks={isCustomer
          ? 'Marketing sedang menyusun ruang lingkup, timeline, dan estimasi biaya proyek.'
          : 'Kebutuhan sudah lengkap. Fitur penyusunan rancangan proyek sedang dikembangkan.'}
        />
      )}

      {isCustomer && <TombolBatalkan data={data} mengirim={mengirim} jalankan={jalankan} />}
    </div>
  )
}

function KartuAksi({ judul, children }) {
  return (
    <div className="card bg-base-100 rounded-3xl border border-base-200 shadow-sm p-5 space-y-3">
      <h3 className="font-bold text-secondary text-sm">{judul}</h3>
      {children}
    </div>
  )
}

function Menunggu({ teks }) {
  return (
    <div className="card bg-sky-50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/50 rounded-3xl p-5 text-sm text-sky-800 dark:text-sky-300">
      {teks}
    </div>
  )
}

/** Marketing menulis beberapa pertanyaan sekaligus untuk satu putaran. */
function FormPertanyaan({ data, mengirim, jalankan }) {
  const [daftar, setDaftar] = useState([''])
  const putaranBaru = data.tahap === 'peninjauan_jawaban'

  const ubah = (i, nilai) => setDaftar(daftar.map((d, j) => (j === i ? nilai : d)))
  const hapus = (i) => setDaftar(daftar.filter((_, j) => j !== i))

  const kirim = async (e) => {
    e.preventDefault()
    const terisi = daftar.map((d) => d.trim()).filter(Boolean)
    if (terisi.length === 0) return
    const ok = await jalankan(
      () => api.post(`/negosiasi/${data.id}/pertanyaan`, { pertanyaan: terisi }),
      `${terisi.length} pertanyaan terkirim ke customer.`
    )
    if (ok) setDaftar([''])
  }

  return (
    <KartuAksi judul={putaranBaru ? `Tanya lagi (putaran ${data.putaran_pertanyaan + 1})` : 'Kirim pertanyaan kebutuhan'}>
      {putaranBaru && (
        <p className="text-xs text-base-content/60">Gunakan ini kalau jawaban customer belum cukup lengkap.</p>
      )}
      <form onSubmit={kirim} className="space-y-2">
        {daftar.map((isi, i) => (
          <div key={i} className="flex gap-2">
            <textarea
              className="textarea textarea-bordered rounded-xl text-sm w-full"
              rows={2}
              placeholder={`Pertanyaan ${i + 1}`}
              value={isi}
              onChange={(e) => ubah(i, e.target.value)}
              maxLength={2000}
            />
            {daftar.length > 1 && (
              <button type="button" className="btn btn-ghost btn-xs text-rose-500" onClick={() => hapus(i)} title="Hapus pertanyaan">&times;</button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-xs text-primary"
          disabled={daftar.length >= 20}
          onClick={() => setDaftar([...daftar, ''])}
        >
          + Tambah pertanyaan
        </button>
        <button type="submit" className="btn btn-primary btn-sm rounded-xl text-white w-full" disabled={mengirim || daftar.every((d) => !d.trim())}>
          {mengirim ? <span className="loading loading-spinner loading-xs"></span> : 'Kirim ke Customer'}
        </button>
      </form>
    </KartuAksi>
  )
}

/** Customer menjawab semua pertanyaan pada putaran berjalan dalam satu kali kirim. */
function FormJawaban({ data, daftar, mengirim, jalankan }) {
  const [jawaban, setJawaban] = useState({})
  const lengkap = daftar.every((q) => (jawaban[q.id] || '').trim())

  const kirim = (e) => {
    e.preventDefault()
    if (!lengkap) return
    jalankan(
      () => api.post(`/negosiasi/${data.id}/jawaban`, {
        jawaban: daftar.map((q) => ({ pertanyaan_id: q.id, isi_jawaban: jawaban[q.id].trim() })),
      }),
      'Jawaban terkirim. Terima kasih!'
    )
  }

  return (
    <KartuAksi judul={`Jawab pertanyaan (putaran ${data.putaran_pertanyaan})`}>
      <p className="text-xs text-base-content/60">Semua pertanyaan wajib dijawab sebelum dikirim.</p>
      <form onSubmit={kirim} className="space-y-3">
        {daftar.map((q) => (
          <label key={q.id} className="block space-y-1">
            <span className="text-xs font-semibold text-secondary">{q.urutan}. {q.isi_pertanyaan}</span>
            <textarea
              className="textarea textarea-bordered rounded-xl text-sm w-full"
              rows={3}
              value={jawaban[q.id] || ''}
              onChange={(e) => setJawaban({ ...jawaban, [q.id]: e.target.value })}
              maxLength={5000}
            />
          </label>
        ))}
        <button type="submit" className="btn btn-primary btn-sm rounded-xl text-white w-full" disabled={mengirim || !lengkap}>
          {mengirim ? <span className="loading loading-spinner loading-xs"></span> : 'Kirim Jawaban'}
        </button>
      </form>
    </KartuAksi>
  )
}

/** Hanya customer yang boleh membatalkan negosiasi. */
function TombolBatalkan({ data, mengirim, jalankan }) {
  const [buka, setBuka] = useState(false)
  const [alasan, setAlasan] = useState('')

  const kirim = async (e) => {
    e.preventDefault()
    if (!alasan.trim()) return
    const ok = await jalankan(
      () => api.post(`/negosiasi/${data.id}/batalkan`, { alasan: alasan.trim() }),
      'Negosiasi dibatalkan.'
    )
    if (ok) setBuka(false)
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm text-rose-600 w-full rounded-xl" onClick={() => setBuka(true)}>
        Batalkan Negosiasi
      </button>
      {buka && (
        <div className="modal modal-open z-50">
          <div className="modal-box rounded-3xl max-w-md border border-base-300">
            <h3 className="font-bold text-lg text-secondary">Batalkan negosiasi?</h3>
            <p className="text-sm text-base-content/60 mt-1">Negosiasi yang dibatalkan tidak bisa dilanjutkan lagi.</p>
            <form onSubmit={kirim} className="mt-4 space-y-3">
              <textarea
                className="textarea textarea-bordered rounded-xl text-sm w-full"
                rows={3}
                placeholder="Alasan pembatalan (wajib)"
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                maxLength={1000}
              />
              <div className="modal-action">
                <button type="button" className="btn btn-ghost btn-sm rounded-xl" onClick={() => setBuka(false)}>Kembali</button>
                <button type="submit" className="btn btn-error btn-sm rounded-xl text-white" disabled={mengirim || !alasan.trim()}>
                  Ya, Batalkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
