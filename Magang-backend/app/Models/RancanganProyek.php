<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RancanganProyek extends Model
{
    use HasFactory;

    protected $table = 'rancangan_proyeks';

    protected $fillable = [
        'negosiasi_id',
        'versi',
        'ruang_lingkup',
        'tanggal_mulai',
        'tanggal_selesai',
        'estimasi_biaya',
        'catatan_rapat',
    ];

    protected $casts = [
        'versi' => 'integer',
        'tanggal_mulai' => 'date',
        'tanggal_selesai' => 'date',
        'estimasi_biaya' => 'decimal:2',
    ];

    public function negosiasi()
    {
        return $this->belongsTo(Negosiasi::class, 'negosiasi_id');
    }

    public function deliverables()
    {
        return $this->hasMany(Deliverable::class, 'rancangan_proyek_id');
    }

    public function tawaranHargas()
    {
        return $this->hasMany(TawaranHarga::class, 'rancangan_proyek_id');
    }
}
