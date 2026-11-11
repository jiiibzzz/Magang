<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JawabanKebutuhan extends Model
{
    public const STATUS_DRAF = 'draf';
    public const STATUS_TERKIRIM = 'terkirim';

    protected $table = 'jawaban_kebutuhan';

    protected $fillable = ['pertanyaan_kebutuhan_id', 'isi', 'status'];

    public function pertanyaan()
    {
        return $this->belongsTo(PertanyaanKebutuhan::class, 'pertanyaan_kebutuhan_id');
    }
}
