<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JawabanKebutuhan extends Model
{
    use HasFactory;

    protected $table = 'jawaban_kebutuhans';

    protected $fillable = [
        'pertanyaan_kebutuhan_id',
        'isi_jawaban',
    ];

    public function pertanyaan()
    {
        return $this->belongsTo(PertanyaanKebutuhan::class, 'pertanyaan_kebutuhan_id');
    }
}
