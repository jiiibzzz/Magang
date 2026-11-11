<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SesiNegosiasi extends Model
{
    public const STATUS_AKTIF = 'aktif';
    public const STATUS_BERHASIL = 'berhasil';
    public const STATUS_GAGAL = 'gagal';
    public const STATUS_DITUTUP = 'ditutup';

    public const TAHAP_KEBUTUHAN = 'kebutuhan';
    public const TAHAP_RANCANGAN = 'rancangan';
    public const TAHAP_PENAWARAN = 'penawaran';
    public const TAHAP_KESEPAKATAN = 'kesepakatan';

    public const MAKS_FOLLOW_UP = 3;
    public const HARI_PERPANJANG_FOLLOW_UP = 3;

    protected $table = 'sesi_negosiasi';

    protected $fillable = [
        'proyek_id', 'customer_id', 'marketing_id', 'chat_session_id',
        'status', 'tahap', 'putaran_kebutuhan', 'menunggu_respons_dari',
        'batas_waktu_respons', 'jumlah_follow_up', 'alasan_selesai', 'selesai_pada',
    ];

    protected $casts = [
        'batas_waktu_respons' => 'datetime',
        'selesai_pada' => 'datetime',
        'putaran_kebutuhan' => 'integer',
        'jumlah_follow_up' => 'integer',
    ];

    public function isAktif(): bool
    {
        return $this->status === self::STATUS_AKTIF;
    }

    public function proyek()
    {
        return $this->belongsTo(Proyek::class, 'proyek_id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function marketing()
    {
        return $this->belongsTo(User::class, 'marketing_id');
    }

    public function chatSession()
    {
        return $this->belongsTo(ChatSession::class, 'chat_session_id');
    }

    public function pertanyaan()
    {
        return $this->hasMany(PertanyaanKebutuhan::class, 'sesi_negosiasi_id')->orderBy('putaran')->orderBy('urutan');
    }

    public function rancangan()
    {
        return $this->hasMany(RancanganProyek::class, 'sesi_negosiasi_id')->orderByDesc('versi');
    }

    public function rancanganTerbaru()
    {
        return $this->hasOne(RancanganProyek::class, 'sesi_negosiasi_id')->latestOfMany('versi');
    }

    public function versiPenawaran()
    {
        return $this->hasMany(VersiPenawaran::class, 'sesi_negosiasi_id')->orderByDesc('versi');
    }

    public function penawaranAktif()
    {
        return $this->hasOne(VersiPenawaran::class, 'sesi_negosiasi_id')
            ->where('status', VersiPenawaran::STATUS_MENUNGGU)
            ->latestOfMany('versi');
    }

    public function permintaanPerubahan()
    {
        return $this->hasMany(PermintaanPerubahan::class, 'sesi_negosiasi_id')->latest('id');
    }

    public function kesepakatan()
    {
        return $this->hasOne(Kesepakatan::class, 'sesi_negosiasi_id');
    }

    public function followUpLogs()
    {
        return $this->hasMany(FollowUpLog::class, 'sesi_negosiasi_id');
    }

    public function riwayat()
    {
        return $this->hasMany(RiwayatNegosiasi::class, 'sesi_negosiasi_id')->latest('id');
    }
}
