<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PertanyaanKebutuhan extends Model
{
    protected $table = 'pertanyaan_kebutuhan';

    protected $fillable = ['sesi_negosiasi_id', 'putaran', 'urutan', 'pertanyaan'];

    protected $casts = [
        'putaran' => 'integer',
        'urutan' => 'integer',
    ];

    public function sesi()
    {
        return $this->belongsTo(SesiNegosiasi::class, 'sesi_negosiasi_id');
    }

    public function jawaban()
    {
        return $this->hasOne(JawabanKebutuhan::class, 'pertanyaan_kebutuhan_id');
    }
}
