<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PermintaanPerubahan extends Model
{
    protected $table = 'permintaan_perubahan';

    protected $fillable = ['sesi_negosiasi_id', 'versi_penawaran_id', 'isi_perubahan'];

    public function versiPenawaran()
    {
        return $this->belongsTo(VersiPenawaran::class, 'versi_penawaran_id');
    }
}
