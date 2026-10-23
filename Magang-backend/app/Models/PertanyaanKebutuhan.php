<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PertanyaanKebutuhan extends Model
{
    use HasFactory;

    protected $table = 'pertanyaan_kebutuhans';

    protected $fillable = [
        'negosiasi_id',
        'putaran',
        'urutan',
        'isi_pertanyaan',
    ];

    protected $casts = [
        'putaran' => 'integer',
        'urutan' => 'integer',
    ];

    public function negosiasi()
    {
        return $this->belongsTo(Negosiasi::class, 'negosiasi_id');
    }

    public function jawaban()
    {
        return $this->hasOne(JawabanKebutuhan::class, 'pertanyaan_kebutuhan_id');
    }
}
