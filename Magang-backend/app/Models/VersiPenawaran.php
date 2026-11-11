<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VersiPenawaran extends Model
{
    public const STATUS_MENUNGGU = 'menunggu';
    public const STATUS_DITERIMA = 'diterima';
    public const STATUS_DITOLAK = 'ditolak';

    public const PIHAK_MARKETING = 'marketing';
    public const PIHAK_CUSTOMER = 'customer';

    protected $table = 'versi_penawaran';

    protected $fillable = [
        'sesi_negosiasi_id', 'rancangan_proyek_id', 'versi', 'pihak', 'harga', 'catatan', 'status',
    ];

    protected $casts = [
        'versi' => 'integer',
        'harga' => 'decimal:2',
    ];

    public function sesi()
    {
        return $this->belongsTo(SesiNegosiasi::class, 'sesi_negosiasi_id');
    }

    public function rancangan()
    {
        return $this->belongsTo(RancanganProyek::class, 'rancangan_proyek_id');
    }
}
