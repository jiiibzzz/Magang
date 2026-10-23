<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Satu sesi negosiasi untuk satu penawaran awal.
 *
 * Kolom status dan tahap disimpan sebagai string; nilai yang sah
 * didaftarkan di konstanta di bawah ini dan dipakai untuk validasi.
 */
class Negosiasi extends Model
{
    use HasFactory;

    protected $table = 'negosiasis';

    // ---- status: hasil akhir sesi ----
    public const STATUS_AKTIF = 'aktif';
    public const STATUS_BERHASIL = 'berhasil';
    public const STATUS_GAGAL = 'gagal';
    public const STATUS_KEDALUWARSA = 'kedaluwarsa';

    public const DAFTAR_STATUS = [
        self::STATUS_AKTIF,
        self::STATUS_BERHASIL,
        self::STATUS_GAGAL,
        self::STATUS_KEDALUWARSA,
    ];

    // ---- tahap: posisi sesi di alur negosiasi ----
    public const TAHAP_MENYUSUN_PERTANYAAN = 'menyusun_pertanyaan';
    public const TAHAP_MENUNGGU_JAWABAN = 'menunggu_jawaban';
    public const TAHAP_PENINJAUAN_JAWABAN = 'peninjauan_jawaban';
    public const TAHAP_RANCANGAN_PROYEK = 'rancangan_proyek';
    public const TAHAP_PENAWARAN = 'penawaran';
    public const TAHAP_MENUNGGU_RESPONS_PENAWARAN = 'menunggu_respons_penawaran';
    public const TAHAP_PENINJAUAN_PENAWARAN_BALIK = 'peninjauan_penawaran_balik';
    public const TAHAP_SELESAI = 'selesai';

    public const DAFTAR_TAHAP = [
        self::TAHAP_MENYUSUN_PERTANYAAN,
        self::TAHAP_MENUNGGU_JAWABAN,
        self::TAHAP_PENINJAUAN_JAWABAN,
        self::TAHAP_RANCANGAN_PROYEK,
        self::TAHAP_PENAWARAN,
        self::TAHAP_MENUNGGU_RESPONS_PENAWARAN,
        self::TAHAP_PENINJAUAN_PENAWARAN_BALIK,
        self::TAHAP_SELESAI,
    ];

    protected $fillable = [
        'penawaran_id',
        'chat_session_id',
        'customer_id',
        'marketing_id',
        'status',
        'tahap',
        'putaran_pertanyaan',
        'batas_respons',
        'alasan_penutupan',
        'ditutup_at',
    ];

    protected $casts = [
        'putaran_pertanyaan' => 'integer',
        'batas_respons' => 'datetime',
        'ditutup_at' => 'datetime',
    ];

    // ---- relasi ke tabel milik CRM ----

    public function penawaran()
    {
        return $this->belongsTo(Penawaran::class, 'penawaran_id');
    }

    public function chatSession()
    {
        return $this->belongsTo(ChatSession::class, 'chat_session_id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function marketing()
    {
        return $this->belongsTo(User::class, 'marketing_id');
    }

    public function proyek()
    {
        return $this->hasOne(Proyek::class, 'negosiasi_id');
    }

    // ---- relasi ke tabel sistem negosiasi ----

    public function pertanyaanKebutuhans()
    {
        return $this->hasMany(PertanyaanKebutuhan::class, 'negosiasi_id')
            ->orderBy('putaran')
            ->orderBy('urutan');
    }

    public function rancanganProyeks()
    {
        return $this->hasMany(RancanganProyek::class, 'negosiasi_id')->orderBy('versi');
    }

    /** Versi rancangan paling baru. */
    public function rancanganTerbaru()
    {
        return $this->hasOne(RancanganProyek::class, 'negosiasi_id')->latestOfMany('versi');
    }

    public function permintaanPerubahans()
    {
        return $this->hasMany(PermintaanPerubahan::class, 'negosiasi_id');
    }

    public function tawaranHargas()
    {
        return $this->hasMany(TawaranHarga::class, 'negosiasi_id')->orderBy('versi');
    }

    /** Tawaran paling baru (yang sedang dibahas). */
    public function tawaranTerbaru()
    {
        return $this->hasOne(TawaranHarga::class, 'negosiasi_id')->latestOfMany('versi');
    }

    public function kesepakatan()
    {
        return $this->hasOne(Kesepakatan::class, 'negosiasi_id');
    }

    public function notifikasis()
    {
        return $this->hasMany(Notifikasi::class, 'negosiasi_id');
    }

    // ---- bantuan ----

    public function isAktif(): bool
    {
        return $this->status === self::STATUS_AKTIF;
    }

    /** Sudah lewat batas waktu respons tetapi masih tercatat aktif. */
    public function isKedaluwarsa(): bool
    {
        return $this->isAktif()
            && $this->batas_respons !== null
            && $this->batas_respons->isPast();
    }

    /** Apakah user ini pihak dalam negosiasi (marketing atau customer-nya). */
    public function melibatkan(User $user): bool
    {
        return $user->id === $this->customer_id || $user->id === $this->marketing_id;
    }
}
