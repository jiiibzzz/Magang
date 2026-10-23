<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TawaranHarga extends Model
{
    use HasFactory;

    protected $table = 'tawaran_hargas';

    public const JENIS_AWAL = 'awal';
    public const JENIS_REVISI = 'revisi';
    public const JENIS_BALIK = 'balik';

    public const PENGAJU_MARKETING = 'marketing';
    public const PENGAJU_CUSTOMER = 'customer';

    public const STATUS_MENUNGGU = 'menunggu';
    public const STATUS_DITERIMA = 'diterima';
    public const STATUS_DITOLAK = 'ditolak';
    public const STATUS_KEDALUWARSA = 'kedaluwarsa';

    protected $fillable = [
        'negosiasi_id',
        'rancangan_proyek_id',
        'versi',
        'jenis',
        'pengaju',
        'harga',
        'catatan',
        'status',
    ];

    protected $casts = [
        'versi' => 'integer',
        'harga' => 'decimal:2',
    ];

    public function negosiasi()
    {
        return $this->belongsTo(Negosiasi::class, 'negosiasi_id');
    }

    public function rancanganProyek()
    {
        return $this->belongsTo(RancanganProyek::class, 'rancangan_proyek_id');
    }

    public function kesepakatan()
    {
        return $this->hasOne(Kesepakatan::class, 'tawaran_harga_id');
    }
}
