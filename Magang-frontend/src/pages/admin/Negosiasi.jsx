import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/useAuth'
import Toast from '../../components/Toast'
import { formatRupiah } from '../../utils/format'

/* ───────────────────────── helpers ───────────────────────── */

const TAHAP = [
  { key: 'kebutuhan', label: 'Kebutuhan' },
  { key: 'rancangan', label: 'Rancangan' },
  { key: 'penawaran', label: 'Penawaran' },
  { key: 'kesepakatan', label: 'Kesepakatan' },
]

const STATUS_STYLE = {
  aktif: 'bg-blue-100 text-blue-700',
  berhasil: 'bg-emerald-100 text-emerald-700',
  gagal: 'bg-rose-100 text-rose-700',
  ditutup: 'bg-slate-200 text-slate-700',
}

const VERSI_STYLE = {
  menunggu: 'bg-amber-100 text-amber-800',
  diterima: 'bg-emerald-100 text-emerald-700',
  ditolak: 'bg-rose-100 text-rose-700',
}

const fmtTanggal = (v, withTime = false) => {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d)) return '-'
  return d.toLocaleString('id-ID', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' })
}

const defaultBatasWaktu = (hari = 3) => {
  const d = new Date(Date.now() + hari * 86400000)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const errMsg = (err, fallback) => {
  const data = err.response?.data
  if (data?.errors) return Object.values(data.errors).flat()[0]
  return data?.message || fallback
}

const inputCls = 'input input-sm w-full rounded-xl border-[#DCE6E1] bg-white text-sm focus:border-primary focus:outline-none'
const textareaCls = 'textarea textarea-sm w-full rounded-xl border-[#DCE6E1] bg-white text-sm leading-relaxed focus:border-primary focus:outline-none'
const btnPrimary = 'btn btn-sm bg-primary hover:opacity-90 text-white border-none rounded-xl px-4 font-bold text-xs shadow-2xs gap-1.5'
const btnGhost = 'btn btn-sm rounded-xl bg-white border border-[#DCE6E1] hover:bg-base-100 hover:border-primary/40 text-secondary font-semibold text-xs px-3 shadow-2xs gap-1.5'
const btnDanger = 'btn btn-sm btn-ghost hover:bg-rose-50 text-rose-600 rounded-xl px-3 font-bold text-xs gap-1.5'

function Card({ title, badge, children, actions }) {
  return (
    <div className="card bg-base-100 border border-base-200 p-5 sm:p-6 rounded-3xl space-y-4 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-base-200 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-secondary text-sm sm:text-base">{title}</h3>
          {badge}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}

function Badge({ className = '', children }) {
  return <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full uppercase ${className}`}>{children}</span>
}

function Field({ label, children, hint }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-bold text-base-content/70">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-base-content/50">{hint}</span>}
    </label>
  )
}

function Empty({ children }) {
  return <p className="text-xs text-base-content/55 italic">{children}</p>
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-base-100 rounded-3xl p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-extrabold text-secondary">{title}</h3>
        {children}
      </div>
    </div>
  )
}

/* ───────────────────────── list ───────────────────────── */

function DaftarSesi({ isMarketing }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const peran = isMarketing ? 'marketing' : 'customer'

  useEffect(() => {
    let batal = false
    setLoading(true)
    api.get('/negosiasi', { params: status ? { status } : {} })
      .then((res) => { if (!batal) setData(res.data.data || []) })
      .catch(() => { if (!batal) setData([]) })
      .finally(() => { if (!batal) setLoading(false) })
    return () => { batal = true }
  }, [status])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-secondary">Sesi Negosiasi</h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {isMarketing
              ? 'Kelola pertanyaan kebutuhan, rancangan proyek, dan penawaran harga untuk setiap pengajuan yang diterima.'
              : 'Jawab pertanyaan kebutuhan dan tanggapi penawaran harga dari tim kami.'}
          </p>
        </div>
        <select className="select select-sm rounded-xl border-[#DCE6E1] w-full sm:w-44 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua status</option>
          <option value="aktif">Aktif</option>
          <option value="berhasil">Berhasil</option>
          <option value="gagal">Gagal</option>
          <option value="ditutup">Ditutup</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>
      ) : data.length === 0 ? (
        <div className="card bg-base-100 border border-base-200 shadow-sm rounded-3xl p-12 text-center space-y-2 max-w-2xl mx-auto">
          <h3 className="text-base font-extrabold text-secondary">Belum ada sesi negosiasi</h3>
          <p className="text-xs text-base-content/65">Sesi dibuka otomatis saat marketing menerima pengajuan proyek.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.map((s) => {
            const giliranSaya = s.status === 'aktif' && s.menunggu_respons_dari === peran
            return (
              <div
                key={s.id}
                onClick={() => navigate(`/admin/negosiasi/${s.id}`)}
                className="group card bg-base-100 border border-base-200 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer rounded-3xl p-5 space-y-3 transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <Badge className={STATUS_STYLE[s.status]}>{s.status}</Badge>
                  {giliranSaya && <Badge className="bg-amber-100 text-amber-800">Menunggu Anda</Badge>}
                </div>
                <h3 className="font-extrabold text-secondary group-hover:text-primary text-sm leading-snug line-clamp-2">{s.proyek?.nama_proyek}</h3>
                <p className="text-[11px] text-base-content/60">
                  {isMarketing ? `Klien: ${s.customer?.name}` : `Marketing: ${s.marketing?.name}`}
                </p>
                <div className="flex items-center gap-1">
                  {TAHAP.map((t, i) => {
                    const idx = TAHAP.findIndex((x) => x.key === s.tahap)
                    return <div key={t.key} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-primary' : 'bg-base-200'}`} title={t.label} />
                  })}
                </div>
                <div className="flex justify-between text-[10px] font-bold text-base-content/50">
                  <span className="capitalize">Tahap {s.tahap}</span>
                  {s.penawaran_aktif && <span className="text-emerald-700">{formatRupiah(s.penawaran_aktif.harga)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── kebutuhan ───────────────────────── */

function SeksiKebutuhan({ sesi, isMarketing, aktif, onAction, busy }) {
  const [daftar, setDaftar] = useState([''])
  const [batas, setBatas] = useState(defaultBatasWaktu())
  const [jawaban, setJawaban] = useState({})
  const [catatan, setCatatan] = useState('')

  const putaranList = useMemo(() => {
    const g = {}
    sesi.pertanyaan.forEach((p) => { (g[p.putaran] ||= []).push(p) })
    return Object.entries(g).map(([putaran, items]) => ({ putaran: Number(putaran), items })).sort((a, b) => b.putaran - a.putaran)
  }, [sesi.pertanyaan])

  const current = sesi.pertanyaan.filter((p) => p.putaran === sesi.putaran_kebutuhan)
  const tahapKebutuhan = aktif && sesi.tahap === 'kebutuhan'
  const sudahTerkirim = current.length > 0 && current.every((p) => p.jawaban?.status === 'terkirim')

  useEffect(() => {
    const init = {}
    current.forEach((p) => { init[p.id] = p.jawaban?.isi || '' })
    setJawaban(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesi.id, sesi.putaran_kebutuhan, sesi.pertanyaan.length])

  const kirimPertanyaan = (e) => {
    e.preventDefault()
    onAction('pertanyaan', { pertanyaan: daftar.map((x) => x.trim()).filter(Boolean), batas_waktu: batas }, 'Pertanyaan kebutuhan terkirim ke customer.', () => setDaftar(['']))
  }

  const simpanJawaban = (aksi) => {
    onAction('jawaban', {
      aksi,
      jawaban: current.map((p) => ({ pertanyaan_id: p.id, isi: jawaban[p.id] || '' })),
    }, aksi === 'kirim' ? 'Jawaban terkirim ke marketing.' : 'Draf jawaban tersimpan.')
  }

  return (
    <Card
      title="Pertanyaan Kebutuhan"
      badge={<Badge className="bg-primary/10 text-primary">Putaran {sesi.putaran_kebutuhan}</Badge>}
    >
      {/* Marketing: susun pertanyaan */}
      {isMarketing && tahapKebutuhan && current.length === 0 && (
        <form onSubmit={kirimPertanyaan} className="space-y-3 p-4 rounded-2xl bg-base-50/80 border border-base-200/90">
          <p className="text-xs font-bold text-secondary">Susun pertanyaan putaran ke-{sesi.putaran_kebutuhan}</p>
          {daftar.map((q, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-xs font-bold text-base-content/50 pt-2 w-5">{i + 1}.</span>
              <textarea
                rows={2}
                className={textareaCls}
                value={q}
                placeholder="Tulis pertanyaan kebutuhan..."
                onChange={(e) => setDaftar(daftar.map((x, j) => (j === i ? e.target.value : x)))}
              />
              {daftar.length > 1 && (
                <button type="button" className="btn btn-xs btn-ghost text-rose-500" onClick={() => setDaftar(daftar.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className={btnGhost} onClick={() => setDaftar([...daftar, ''])}>+ Tambah pertanyaan</button>
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <Field label="Batas waktu respons customer">
              <input type="datetime-local" className={inputCls} value={batas} onChange={(e) => setBatas(e.target.value)} required />
            </Field>
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy && <span className="loading loading-spinner loading-xs"></span>}Kirim Pertanyaan
            </button>
          </div>
        </form>
      )}

      {isMarketing && tahapKebutuhan && current.length > 0 && !sudahTerkirim && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          Menunggu jawaban customer sebelum {fmtTanggal(sesi.batas_waktu_respons, true)}.
        </div>
      )}

      {!isMarketing && tahapKebutuhan && current.length === 0 && (
        <Empty>Tim marketing sedang menyusun pertanyaan kebutuhan untuk Anda.</Empty>
      )}

      {/* Customer: jawab pertanyaan */}
      {!isMarketing && tahapKebutuhan && current.length > 0 && !sudahTerkirim && (
        <div className="space-y-3 p-4 rounded-2xl bg-base-50/80 border border-base-200/90">
          <p className="text-xs font-bold text-secondary">
            Jawab sebelum {fmtTanggal(sesi.batas_waktu_respons, true)}
            <span className="font-medium text-base-content/55"> · Terisi {current.filter((p) => (jawaban[p.id] || '').trim()).length}/{current.length}</span>
          </p>
          {current.map((p) => (
            <Field key={p.id} label={`${p.urutan}. ${p.pertanyaan}`}>
              <textarea rows={3} className={textareaCls} value={jawaban[p.id] || ''} onChange={(e) => setJawaban({ ...jawaban, [p.id]: e.target.value })} />
            </Field>
          ))}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={busy} className={btnGhost} onClick={() => simpanJawaban('draf')}>Simpan Draf</button>
            <button type="button" disabled={busy} className={btnPrimary} onClick={() => simpanJawaban('kirim')}>
              {busy && <span className="loading loading-spinner loading-xs"></span>}Kirim Jawaban
            </button>
          </div>
        </div>
      )}

      {/* Marketing: periksa jawaban */}
      {isMarketing && tahapKebutuhan && sudahTerkirim && (
        <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
          <p className="text-xs font-bold text-emerald-900">Jawaban putaran ke-{sesi.putaran_kebutuhan} sudah masuk. Periksa kelengkapannya.</p>
          <textarea rows={2} className={textareaCls} placeholder="Catatan pemeriksaan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={busy} className={btnGhost} onClick={() => onAction('periksa', { hasil: 'belum_lengkap', catatan }, 'Lanjut ke putaran pertanyaan berikutnya.', () => setCatatan(''))}>
              Belum Lengkap (Tambah Putaran)
            </button>
            <button type="button" disabled={busy} className={btnPrimary} onClick={() => onAction('periksa', { hasil: 'lengkap', catatan }, 'Kebutuhan lengkap. Lanjut ke rancangan proyek.', () => setCatatan(''))}>
              Lengkap, Lanjut Rancangan
            </button>
          </div>
        </div>
      )}

      {/* Riwayat tanya-jawab */}
      {putaranList.length === 0 ? (
        !tahapKebutuhan && <Empty>Belum ada pertanyaan.</Empty>
      ) : (
        <div className="space-y-4">
          {putaranList.map(({ putaran, items }) => (
            <details key={putaran} open={putaran === sesi.putaran_kebutuhan || putaranList.length === 1} className="group">
              <summary className="cursor-pointer text-[11px] font-bold uppercase text-base-content/55">Putaran {putaran} · {items.length} pertanyaan</summary>
              <div className="mt-2 space-y-2">
                {items.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl border border-base-200 bg-white">
                    <p className="text-xs font-bold text-secondary">{p.urutan}. {p.pertanyaan}</p>
                    <p className="text-xs text-base-content/70 mt-1 whitespace-pre-line">
                      {p.jawaban?.status === 'terkirim' ? p.jawaban.isi : <span className="italic text-base-content/45">{p.jawaban ? 'Draf (belum dikirim)' : 'Belum dijawab'}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ───────────────────────── rancangan ───────────────────────── */

const rancanganKosong = {
  tujuan: '', ruang_lingkup: '', tanggal_mulai: '', tanggal_selesai: '', risiko: '',
  deliverables: [{ nama: '', target_tanggal: '' }],
  rincian_biaya: [{ item: '', jumlah: 1, harga_satuan: '' }],
}

function TampilRancangan({ r }) {
  return (
    <div className="space-y-3 text-xs">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><p className="font-bold text-base-content/55 text-[10px] uppercase">Tujuan</p><p className="whitespace-pre-line">{r.tujuan}</p></div>
        <div><p className="font-bold text-base-content/55 text-[10px] uppercase">Timeline</p><p>{fmtTanggal(r.tanggal_mulai)} – {fmtTanggal(r.tanggal_selesai)}</p></div>
      </div>
      <div><p className="font-bold text-base-content/55 text-[10px] uppercase">Ruang Lingkup</p><p className="whitespace-pre-line">{r.ruang_lingkup}</p></div>
      <div>
        <p className="font-bold text-base-content/55 text-[10px] uppercase mb-1">Deliverable</p>
        <ul className="list-disc pl-5 space-y-0.5">
          {r.deliverables?.map((d) => <li key={d.id}>{d.nama}{d.target_tanggal && <span className="text-base-content/55"> · {fmtTanggal(d.target_tanggal)}</span>}</li>)}
        </ul>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-xs">
          <thead><tr><th>Item</th><th className="text-right">Jumlah</th><th className="text-right">Harga Satuan</th><th className="text-right">Subtotal</th></tr></thead>
          <tbody>
            {r.rincian_biaya?.map((b) => (
              <tr key={b.id}><td>{b.item}</td><td className="text-right">{b.jumlah}</td><td className="text-right">{formatRupiah(b.harga_satuan)}</td><td className="text-right">{formatRupiah(b.subtotal)}</td></tr>
            ))}
            <tr className="font-extrabold"><td colSpan={3}>Total</td><td className="text-right text-emerald-700">{formatRupiah(r.total_biaya)}</td></tr>
          </tbody>
        </table>
      </div>
      {r.risiko && <div><p className="font-bold text-base-content/55 text-[10px] uppercase">Risiko</p><p className="whitespace-pre-line">{r.risiko}</p></div>}
    </div>
  )
}

function SeksiRancangan({ sesi, isMarketing, aktif, onAction, busy }) {
  const terbaru = sesi.rancangan?.[0]
  const [form, setForm] = useState(rancanganKosong)
  const [lihatVersi, setLihatVersi] = useState(null)
  const bisaInput = isMarketing && aktif && sesi.tahap === 'rancangan'
  const perubahanTerakhir = sesi.permintaan_perubahan?.[0]

  useEffect(() => {
    if (!bisaInput) return
    if (terbaru) {
      setForm({
        tujuan: terbaru.tujuan, ruang_lingkup: terbaru.ruang_lingkup,
        tanggal_mulai: terbaru.tanggal_mulai?.slice(0, 10) || '', tanggal_selesai: terbaru.tanggal_selesai?.slice(0, 10) || '',
        risiko: terbaru.risiko || '',
        deliverables: terbaru.deliverables.map((d) => ({ nama: d.nama, target_tanggal: d.target_tanggal?.slice(0, 10) || '' })),
        rincian_biaya: terbaru.rincian_biaya.map((b) => ({ item: b.item, jumlah: b.jumlah, harga_satuan: Number(b.harga_satuan) })),
      })
    } else {
      setForm(rancanganKosong)
    }
  }, [bisaInput, terbaru])

  const total = form.rincian_biaya.reduce((t, b) => t + (Number(b.jumlah) || 0) * (Number(b.harga_satuan) || 0), 0)
  const setRow = (key, i, field, val) => setForm({ ...form, [key]: form[key].map((r, j) => (j === i ? { ...r, [field]: val } : r)) })

  const simpan = (e) => {
    e.preventDefault()
    onAction('rancangan', {
      ...form,
      deliverables: form.deliverables.filter((d) => d.nama.trim()).map((d) => ({ ...d, target_tanggal: d.target_tanggal || null })),
      rincian_biaya: form.rincian_biaya.filter((b) => b.item.trim()),
    }, 'Rancangan proyek tersimpan sebagai versi baru.')
  }

  const ditampilkan = sesi.rancangan?.find((r) => r.id === lihatVersi) || terbaru

  return (
    <Card
      title="Rancangan Proyek"
      badge={terbaru && <Badge className="bg-primary/10 text-primary">Versi {terbaru.versi}</Badge>}
      actions={sesi.rancangan?.length > 1 && !bisaInput && (
        <select className="select select-xs rounded-lg border-[#DCE6E1] text-xs" value={ditampilkan?.id} onChange={(e) => setLihatVersi(Number(e.target.value))}>
          {sesi.rancangan.map((r) => <option key={r.id} value={r.id}>Versi {r.versi}</option>)}
        </select>
      )}
    >
      {bisaInput && perubahanTerakhir && (
        <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
          <p className="font-bold">Permintaan perubahan kebutuhan dari customer:</p>
          <p className="whitespace-pre-line mt-1">{perubahanTerakhir.isi_perubahan}</p>
        </div>
      )}

      {bisaInput ? (
        <form onSubmit={simpan} className="space-y-3">
          <p className="text-[11px] text-base-content/55">Isi setelah rapat dengan atasan. Setiap simpan membuat versi rancangan baru.</p>
          <Field label="Tujuan proyek"><textarea rows={2} className={textareaCls} value={form.tujuan} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} required /></Field>
          <Field label="Ruang lingkup"><textarea rows={3} className={textareaCls} value={form.ruang_lingkup} onChange={(e) => setForm({ ...form, ruang_lingkup: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal mulai"><input type="date" className={inputCls} value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} required /></Field>
            <Field label="Tanggal selesai"><input type="date" className={inputCls} value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} required /></Field>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-base-content/70">Deliverable</p>
            {form.deliverables.map((d, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputCls} placeholder="Nama deliverable" value={d.nama} onChange={(e) => setRow('deliverables', i, 'nama', e.target.value)} />
                <input type="date" className={`${inputCls} max-w-40`} value={d.target_tanggal} onChange={(e) => setRow('deliverables', i, 'target_tanggal', e.target.value)} />
                {form.deliverables.length > 1 && <button type="button" className="btn btn-xs btn-ghost text-rose-500" onClick={() => setForm({ ...form, deliverables: form.deliverables.filter((_, j) => j !== i) })}>✕</button>}
              </div>
            ))}
            <button type="button" className={btnGhost} onClick={() => setForm({ ...form, deliverables: [...form.deliverables, { nama: '', target_tanggal: '' }] })}>+ Deliverable</button>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-base-content/70">Rincian biaya</p>
            {form.rincian_biaya.map((b, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputCls} placeholder="Item" value={b.item} onChange={(e) => setRow('rincian_biaya', i, 'item', e.target.value)} />
                <input type="number" min="1" className={`${inputCls} max-w-20`} value={b.jumlah} onChange={(e) => setRow('rincian_biaya', i, 'jumlah', e.target.value)} />
                <input type="number" min="0" className={`${inputCls} max-w-40`} placeholder="Harga satuan" value={b.harga_satuan} onChange={(e) => setRow('rincian_biaya', i, 'harga_satuan', e.target.value)} />
                {form.rincian_biaya.length > 1 && <button type="button" className="btn btn-xs btn-ghost text-rose-500" onClick={() => setForm({ ...form, rincian_biaya: form.rincian_biaya.filter((_, j) => j !== i) })}>✕</button>}
              </div>
            ))}
            <div className="flex justify-between items-center">
              <button type="button" className={btnGhost} onClick={() => setForm({ ...form, rincian_biaya: [...form.rincian_biaya, { item: '', jumlah: 1, harga_satuan: '' }] })}>+ Item biaya</button>
              <span className="text-xs font-extrabold text-emerald-700">Total: {formatRupiah(total, 'Rp. 0')}</span>
            </div>
          </div>

          <Field label="Risiko"><textarea rows={2} className={textareaCls} value={form.risiko} onChange={(e) => setForm({ ...form, risiko: e.target.value })} /></Field>
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className={btnPrimary}>{busy && <span className="loading loading-spinner loading-xs"></span>}Simpan Rancangan</button>
          </div>
        </form>
      ) : ditampilkan ? (
        <TampilRancangan r={ditampilkan} />
      ) : (
        <Empty>{sesi.tahap === 'kebutuhan' ? 'Rancangan disusun setelah kebutuhan dinyatakan lengkap.' : 'Rancangan sedang disusun oleh marketing.'}</Empty>
      )}
    </Card>
  )
}

/* ───────────────────────── penawaran ───────────────────────── */

function SeksiPenawaran({ sesi, isMarketing, aktif, onAction, busy }) {
  const aktifVersi = sesi.versi_penawaran?.find((v) => v.status === 'menunggu')
  const terbaru = sesi.rancangan?.[0]
  const tahapPenawaran = aktif && sesi.tahap === 'penawaran'
  const [form, setForm] = useState({ harga: '', catatan: '', batas_waktu: defaultBatasWaktu() })
  const [modal, setModal] = useState(null) // setujui | tawar | ubah | batal | tolak
  const [isian, setIsian] = useState({ harga: '', alasan: '' })

  useEffect(() => {
    if (terbaru && tahapPenawaran && !aktifVersi) setForm((f) => ({ ...f, harga: f.harga || Number(terbaru.total_biaya) }))
  }, [terbaru, tahapPenawaran, aktifVersi])

  const tutup = () => { setModal(null); setIsian({ harga: '', alasan: '' }) }

  return (
    <Card title="Penawaran Harga" badge={aktifVersi && <Badge className="bg-amber-100 text-amber-800">Versi {aktifVersi.versi} aktif</Badge>}>
      {/* Penawaran aktif */}
      {aktifVersi && (
        <div className="p-4 rounded-2xl bg-base-50/80 border border-base-200/90 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <p className="text-[11px] font-bold text-base-content/55 uppercase">
                {aktifVersi.pihak === 'marketing' ? 'Penawaran marketing' : 'Penawaran balik customer'} · versi {aktifVersi.versi}
              </p>
              <p className="text-xl font-extrabold text-emerald-700 tracking-tight">{formatRupiah(aktifVersi.harga)}</p>
            </div>
            {aktifVersi.pihak === 'marketing' && sesi.batas_waktu_respons && (
              <span className="text-[11px] text-base-content/60">Tanggapi sebelum <b>{fmtTanggal(sesi.batas_waktu_respons, true)}</b></span>
            )}
          </div>
          {aktifVersi.catatan && <p className="text-xs text-base-content/70 whitespace-pre-line">“{aktifVersi.catatan}”</p>}

          {!isMarketing && aktifVersi.pihak === 'marketing' && tahapPenawaran && (
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-base-200">
              <button className={btnDanger} onClick={() => setModal('batal')}>Batalkan</button>
              <button className={btnGhost} onClick={() => setModal('ubah')}>Ubah Kebutuhan</button>
              <button className={btnGhost} onClick={() => setModal('tawar')}>Tawar Harga</button>
              <button className={btnPrimary} onClick={() => setModal('setujui')}>Setujui</button>
            </div>
          )}
          {!isMarketing && aktifVersi.pihak === 'customer' && <Empty>Menunggu tinjauan marketing atas penawaran balik Anda.</Empty>}

          {isMarketing && aktifVersi.pihak === 'customer' && tahapPenawaran && (
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-base-200">
              <button className={btnDanger} disabled={busy} onClick={() => setModal('tolak')}>Tolak &amp; Buat Revisi</button>
              <button className={btnPrimary} disabled={busy} onClick={() => onAction(`penawaran/${aktifVersi.id}/tinjau`, { keputusan: 'terima' }, 'Penawaran balik diterima. Kesepakatan tercapai.')}>
                {busy && <span className="loading loading-spinner loading-xs"></span>}Terima {formatRupiah(aktifVersi.harga)}
              </button>
            </div>
          )}
          {isMarketing && aktifVersi.pihak === 'marketing' && <Empty>Menunggu tanggapan customer.</Empty>}
        </div>
      )}

      {/* Marketing: buat penawaran / revisi */}
      {isMarketing && tahapPenawaran && !aktifVersi && (
        <form
          className="space-y-3 p-4 rounded-2xl bg-base-50/80 border border-base-200/90"
          onSubmit={(e) => { e.preventDefault(); onAction('penawaran', form, 'Penawaran terkirim ke customer.', () => setForm({ harga: '', catatan: '', batas_waktu: defaultBatasWaktu() })) }}
        >
          <p className="text-xs font-bold text-secondary">
            {sesi.versi_penawaran?.length ? 'Buat penawaran revisi' : 'Buat penawaran harga'}
            {terbaru && <span className="font-medium text-base-content/55"> · berdasarkan rancangan versi {terbaru.versi} ({formatRupiah(terbaru.total_biaya)})</span>}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Harga penawaran (Rp)"><input type="number" min="1" className={inputCls} value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} required /></Field>
            <Field label="Batas waktu respons"><input type="datetime-local" className={inputCls} value={form.batas_waktu} onChange={(e) => setForm({ ...form, batas_waktu: e.target.value })} required /></Field>
          </div>
          <Field label="Catatan"><textarea rows={2} className={textareaCls} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></Field>
          <div className="flex justify-end"><button type="submit" disabled={busy} className={btnPrimary}>{busy && <span className="loading loading-spinner loading-xs"></span>}Kirim Penawaran</button></div>
        </form>
      )}

      {!aktifVersi && !(isMarketing && tahapPenawaran) && (sesi.versi_penawaran?.length ?? 0) === 0 && (
        <Empty>Penawaran harga dibuat setelah rancangan proyek selesai.</Empty>
      )}

      {/* Riwayat versi */}
      {sesi.versi_penawaran?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-xs">
            <thead><tr><th>Versi</th><th>Pihak</th><th className="text-right">Harga</th><th>Status</th><th>Tanggal</th></tr></thead>
            <tbody>
              {sesi.versi_penawaran.map((v) => (
                <tr key={v.id}>
                  <td className="font-bold">v{v.versi}</td>
                  <td className="capitalize">{v.pihak}</td>
                  <td className="text-right font-semibold">{formatRupiah(v.harga)}</td>
                  <td><Badge className={VERSI_STYLE[v.status]}>{v.status}</Badge></td>
                  <td className="text-base-content/60">{fmtTanggal(v.created_at, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modal === 'setujui' && (
        <Modal title="Setujui Kesepakatan" onClose={tutup}>
          <div className="text-xs space-y-1.5 p-3 rounded-xl bg-base-50 border border-base-200">
            <p>Proyek: <b>{sesi.proyek?.nama_proyek}</b></p>
            <p>Harga: <b className="text-emerald-700">{formatRupiah(aktifVersi.harga)}</b></p>
            {terbaru && <p>Periode: {fmtTanggal(terbaru.tanggal_mulai)} – {fmtTanggal(terbaru.tanggal_selesai)}</p>}
          </div>
          <p className="text-xs text-base-content/70">Dengan menyetujui, kesepakatan dikunci, kontrak &amp; project charter dibuat, dan proyek masuk tahap Proses Pengerjaan.</p>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={tutup}>Kembali</button>
            <button className={btnPrimary} disabled={busy} onClick={() => onAction('setujui', { versi_penawaran_id: aktifVersi.id }, 'Kesepakatan tercapai!', tutup)}>
              {busy && <span className="loading loading-spinner loading-xs"></span>}Ya, Setujui
            </button>
          </div>
        </Modal>
      )}
      {modal === 'tawar' && (
        <Modal title="Ajukan Penawaran Balik" onClose={tutup}>
          <Field label="Harga usulan (Rp)"><input type="number" min="1" className={inputCls} value={isian.harga} onChange={(e) => setIsian({ ...isian, harga: e.target.value })} /></Field>
          <Field label="Alasan"><textarea rows={3} className={textareaCls} value={isian.alasan} onChange={(e) => setIsian({ ...isian, alasan: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={tutup}>Batal</button>
            <button className={btnPrimary} disabled={busy} onClick={() => onAction('penawaran-balik', isian, 'Penawaran balik terkirim.', tutup)}>Kirim</button>
          </div>
        </Modal>
      )}
      {modal === 'ubah' && (
        <Modal title="Ajukan Perubahan Kebutuhan" onClose={tutup}>
          <p className="text-xs text-base-content/60">Penawaran aktif akan ditolak dan marketing menyusun ulang rancangan proyek.</p>
          <Field label="Perubahan yang diinginkan"><textarea rows={4} className={textareaCls} value={isian.alasan} onChange={(e) => setIsian({ ...isian, alasan: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={tutup}>Batal</button>
            <button className={btnPrimary} disabled={busy} onClick={() => onAction('perubahan', { isi_perubahan: isian.alasan }, 'Perubahan kebutuhan terkirim.', tutup)}>Kirim</button>
          </div>
        </Modal>
      )}
      {modal === 'batal' && (
        <Modal title="Batalkan Negosiasi" onClose={tutup}>
          <p className="text-xs text-rose-700">Negosiasi akan ditandai gagal dan tidak dapat dilanjutkan.</p>
          <Field label="Alasan pembatalan"><textarea rows={3} className={textareaCls} value={isian.alasan} onChange={(e) => setIsian({ ...isian, alasan: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={tutup}>Kembali</button>
            <button className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white border-none rounded-xl px-4 font-bold text-xs" disabled={busy} onClick={() => onAction('batalkan', { alasan: isian.alasan }, 'Negosiasi dibatalkan.', tutup)}>Ya, Batalkan</button>
          </div>
        </Modal>
      )}
      {modal === 'tolak' && (
        <Modal title="Tolak Penawaran Balik" onClose={tutup}>
          <Field label="Catatan (opsional)"><textarea rows={3} className={textareaCls} value={isian.alasan} onChange={(e) => setIsian({ ...isian, alasan: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={tutup}>Batal</button>
            <button className={btnPrimary} disabled={busy} onClick={() => onAction(`penawaran/${aktifVersi.id}/tinjau`, { keputusan: 'tolak', catatan: isian.alasan }, 'Penawaran balik ditolak. Silakan kirim penawaran revisi.', tutup)}>Tolak</button>
          </div>
        </Modal>
      )}
    </Card>
  )
}

/* ───────────────────────── kesepakatan ───────────────────────── */

function SeksiKesepakatan({ sesi, isMarketing, showToast }) {
  const k = sesi.kesepakatan
  const [unduh, setUnduh] = useState(null)
  if (!k) return null

  const download = async (d) => {
    setUnduh(d.id)
    try {
      const res = await api.get(`/negosiasi/${sesi.id}/dokumen/${d.id}/unduh`, { responseType: 'blob' })
      const cd = res.headers['content-disposition'] || ''
      const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
      const nama = m ? decodeURIComponent(m[1]) : `${d.jenis}.${d.format}`
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = nama
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast('Dokumen gagal diunduh.', 'error')
    } finally {
      setUnduh(null)
    }
  }

  return (
    <Card title="Kesepakatan" badge={<Badge className="bg-emerald-100 text-emerald-700">Tercapai</Badge>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-[10px] font-bold uppercase text-emerald-700/70">Harga Final</p>
          <p className="text-lg font-extrabold text-emerald-700">{formatRupiah(k.harga_final)}</p>
        </div>
        <div className="p-3 rounded-xl bg-base-50 border border-base-200 text-xs">
          <p className="text-[10px] font-bold uppercase text-base-content/55">Nomor</p>
          <p className="font-bold">{k.snapshot?.nomor}</p>
          <p className="text-base-content/60">Dikunci {fmtTanggal(k.created_at, true)}</p>
        </div>
      </div>
      {isMarketing ? (
        <div className="grid sm:grid-cols-2 gap-2">
          {k.dokumen?.map((d) => (
            <button key={d.id} className={`${btnGhost} justify-between`} disabled={unduh === d.id} onClick={() => download(d)}>
              <span>{d.jenis === 'kontrak' ? 'Kontrak' : 'Project Charter'}</span>
              <span className="flex items-center gap-1.5">
                {unduh === d.id ? <span className="loading loading-spinner loading-xs"></span> : <Badge className={d.format === 'pdf' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}>{d.format}</Badge>}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Empty>Kontrak &amp; project charter telah dibuat oleh sistem dan akan dikirimkan oleh tim marketing.</Empty>
      )}
    </Card>
  )
}

/* ───────────────────────── detail ───────────────────────── */

function DetailSesi({ id, isMarketing }) {
  const navigate = useNavigate()
  const [sesi, setSesi] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500)
  }, [])

  const muat = useCallback(async () => {
    try {
      const res = await api.get(`/negosiasi/${id}`)
      setSesi(res.data.sesi)
    } catch (err) {
      showToast(errMsg(err, 'Sesi negosiasi tidak ditemukan.'), 'error')
      setSesi(null)
    } finally {
      setLoading(false)
    }
  }, [id, showToast])

  useEffect(() => { setLoading(true); muat() }, [muat])

  const onAction = async (path, payload, sukses, after) => {
    setBusy(true)
    try {
      await api.post(`/negosiasi/${id}/${path}`, payload)
      showToast(sukses)
      after?.()
      await muat()
    } catch (err) {
      showToast(errMsg(err, 'Aksi gagal diproses.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>
  if (!sesi) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-sm text-base-content/60">Sesi negosiasi tidak dapat dimuat.</p>
        <button className={btnGhost} onClick={() => navigate('/admin/negosiasi')}>Kembali ke daftar</button>
        <Toast show={toast.show} type={toast.type} message={toast.message} onClose={() => setToast((t) => ({ ...t, show: false }))} />
      </div>
    )
  }

  const aktif = sesi.status === 'aktif'
  const peran = isMarketing ? 'marketing' : 'customer'
  const idxTahap = TAHAP.findIndex((t) => t.key === sesi.tahap)
  const props = { sesi, isMarketing, aktif, onAction, busy }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-secondary">{sesi.proyek?.nama_proyek}</h1>
            <Badge className={STATUS_STYLE[sesi.status]}>{sesi.status}</Badge>
          </div>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {isMarketing ? `Klien: ${sesi.customer?.name} (${sesi.customer?.email})` : `Marketing: ${sesi.marketing?.name}`}
            {sesi.proyek?.layanan?.title && ` · ${sesi.proyek.layanan.title}`}
          </p>
        </div>
        <div className="flex gap-2">
          {sesi.chat_session_id && <button className={btnGhost} onClick={() => navigate('/admin/chat')}>Buka Chat</button>}
          <button className={btnGhost} onClick={() => navigate('/admin/negosiasi')}>Kembali ke Daftar</button>
        </div>
      </div>

      {/* Stepper + status */}
      <div className="card bg-base-100 border border-base-200 p-5 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center">
          {TAHAP.map((t, i) => (
            <div key={t.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${
                  i < idxTahap || sesi.status === 'berhasil' ? 'bg-primary text-white' : i === idxTahap ? 'bg-primary/15 text-primary ring-2 ring-primary' : 'bg-base-200 text-base-content/40'
                }`}>{i + 1}</div>
                <span className={`text-[10px] font-bold ${i <= idxTahap ? 'text-secondary' : 'text-base-content/40'}`}>{t.label}</span>
              </div>
              {i < TAHAP.length - 1 && <div className={`h-0.5 flex-1 mx-2 mb-4 ${i < idxTahap ? 'bg-primary' : 'bg-base-200'}`} />}
            </div>
          ))}
        </div>

        {aktif ? (
          <div className={`p-3 rounded-2xl text-xs flex flex-wrap gap-x-6 gap-y-1 ${sesi.menunggu_respons_dari === peran ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-base-50 border border-base-200 text-base-content/70'}`}>
            <span><b>{sesi.menunggu_respons_dari === peran ? 'Giliran Anda' : `Menunggu ${sesi.menunggu_respons_dari}`}</b></span>
            {sesi.batas_waktu_respons && <span>Batas respons: <b>{fmtTanggal(sesi.batas_waktu_respons, true)}</b></span>}
            {sesi.menunggu_respons_dari === 'customer' && <span>Follow up otomatis: <b>{sesi.jumlah_follow_up}/3</b></span>}
          </div>
        ) : (
          <div className={`p-3 rounded-2xl text-xs ${sesi.status === 'berhasil' ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900'}`}>
            <b>{sesi.status === 'berhasil' ? 'Kesepakatan tercapai' : sesi.status === 'gagal' ? 'Negosiasi gagal' : 'Sesi ditutup'}</b>
            {' '}pada {fmtTanggal(sesi.selesai_pada, true)}.{sesi.alasan_selesai && ` ${sesi.alasan_selesai}`}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SeksiKesepakatan sesi={sesi} isMarketing={isMarketing} showToast={showToast} />
          {(idxTahap >= 2 || sesi.versi_penawaran?.length > 0) && <SeksiPenawaran {...props} />}
          {(idxTahap >= 1 || sesi.rancangan?.length > 0) && <SeksiRancangan {...props} />}
          <SeksiKebutuhan {...props} />
        </div>

        <div className="space-y-6">
          <Card title="Riwayat Sesi">
            {sesi.riwayat?.length ? (
              <ol className="relative border-l border-base-200 ml-1.5 space-y-4">
                {sesi.riwayat.map((r) => (
                  <li key={r.id} className="ml-4">
                    <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-primary/70 border-2 border-white"></span>
                    <p className="text-[10px] text-base-content/50">{fmtTanggal(r.created_at, true)} · {r.user?.name || 'Sistem'}</p>
                    <p className="text-xs font-bold text-secondary capitalize">{r.aksi.replaceAll('_', ' ')}</p>
                    {r.keterangan && <p className="text-[11px] text-base-content/65 whitespace-pre-line">{r.keterangan}</p>}
                  </li>
                ))}
              </ol>
            ) : <Empty>Belum ada aktivitas.</Empty>}
          </Card>
          <Card title="Proyek">
            <div className="text-xs space-y-1.5">
              <p className="text-base-content/70 whitespace-pre-line">{sesi.proyek?.deskripsi_kebutuhan}</p>
              <button className={`${btnGhost} mt-2`} onClick={() => navigate('/admin/proyek')}>Lihat di Proyek</button>
            </div>
          </Card>
        </div>
      </div>

      <Toast show={toast.show} type={toast.type} message={toast.message} onClose={() => setToast((t) => ({ ...t, show: false }))} />
    </div>
  )
}

export default function Negosiasi() {
  const { id } = useParams()
  const { hasPermission } = useAuth()
  const isMarketing = hasPermission('kelola_proyek')

  return id ? <DetailSesi key={id} id={id} isMarketing={isMarketing} /> : <DaftarSesi isMarketing={isMarketing} />
}
