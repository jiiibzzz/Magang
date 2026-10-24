// Teks dan warna untuk status & tahap negosiasi.
// Nilai kuncinya harus sama dengan konstanta di model Negosiasi (backend).

export const LABEL_TAHAP = {
  menyusun_pertanyaan: 'Menyusun pertanyaan',
  menunggu_jawaban: 'Menunggu jawaban customer',
  peninjauan_jawaban: 'Peninjauan jawaban',
  rancangan_proyek: 'Penyusunan rancangan proyek',
  penawaran: 'Penawaran harga',
  menunggu_respons_penawaran: 'Menunggu respons penawaran',
  peninjauan_penawaran_balik: 'Peninjauan penawaran balik',
  selesai: 'Selesai',
}

export const LABEL_STATUS = {
  aktif: 'Aktif',
  berhasil: 'Berhasil',
  gagal: 'Dibatalkan',
  kedaluwarsa: 'Kedaluwarsa',
}

export const WARNA_STATUS = {
  aktif: 'bg-sky-500 text-white',
  berhasil: 'bg-emerald-500 text-white',
  gagal: 'bg-rose-500 text-white',
  kedaluwarsa: 'bg-base-300 text-base-content/70',
}

// Urutan langkah besar yang ditampilkan di stepper halaman detail.
export const LANGKAH = [
  { kunci: 'kebutuhan', label: 'Kebutuhan', tahap: ['menyusun_pertanyaan', 'menunggu_jawaban', 'peninjauan_jawaban'] },
  { kunci: 'rancangan', label: 'Rancangan proyek', tahap: ['rancangan_proyek'] },
  { kunci: 'harga', label: 'Negosiasi harga', tahap: ['penawaran', 'menunggu_respons_penawaran', 'peninjauan_penawaran_balik'] },
  { kunci: 'kesepakatan', label: 'Kesepakatan', tahap: ['selesai'] },
]

export const indeksLangkah = (tahap) => LANGKAH.findIndex((l) => l.tahap.includes(tahap))

export const formatTanggal = (iso) =>
  iso
    ? new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-'

export const formatRupiah = (angka) =>
  angka === null || angka === undefined || angka === ''
    ? '-'
    : 'Rp ' + Number(angka).toLocaleString('id-ID', { maximumFractionDigits: 0 })
