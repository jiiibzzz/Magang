<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kesepakatan extends Model
{
    protected $table = 'kesepakatan';

    protected $fillable = ['sesi_negosiasi_id', 'versi_penawaran_id', 'harga_final', 'snapshot'];

    protected $casts = [
        'harga_final' => 'decimal:2',
        'snapshot' => 'array',
    ];

    public function sesi()
    {
        return $this->belongsTo(SesiNegosiasi::class, 'sesi_negosiasi_id');
    }

    public function versiPenawaran()
    {
        return $this->belongsTo(VersiPenawaran::class, 'versi_penawaran_id');
    }

    public function dokumen()
    {
        return $this->hasMany(DokumenKesepakatan::class, 'kesepakatan_id');
    }
}
