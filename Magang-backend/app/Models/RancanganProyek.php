<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RancanganProyek extends Model
{
    protected $table = 'rancangan_proyek';

    protected $fillable = [
        'sesi_negosiasi_id', 'versi', 'tujuan', 'ruang_lingkup',
        'tanggal_mulai', 'tanggal_selesai', 'total_biaya', 'risiko',
    ];

    protected $casts = [
        'versi' => 'integer',
        'tanggal_mulai' => 'date:Y-m-d',
        'tanggal_selesai' => 'date:Y-m-d',
        'total_biaya' => 'decimal:2',
    ];

    public function sesi()
    {
        return $this->belongsTo(SesiNegosiasi::class, 'sesi_negosiasi_id');
    }

    public function deliverables()
    {
        return $this->hasMany(Deliverable::class, 'rancangan_proyek_id');
    }

    public function rincianBiaya()
    {
        return $this->hasMany(RincianBiaya::class, 'rancangan_proyek_id');
    }
}
