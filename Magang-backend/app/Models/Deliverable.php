<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Deliverable extends Model
{
    use HasFactory;

    protected $table = 'deliverables';

    protected $fillable = [
        'rancangan_proyek_id',
        'nama_deliverable',
        'deskripsi',
        'target_tanggal',
    ];

    protected $casts = [
        'target_tanggal' => 'date',
    ];

    public function rancanganProyek()
    {
        return $this->belongsTo(RancanganProyek::class, 'rancangan_proyek_id');
    }
}
