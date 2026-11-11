<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RiwayatNegosiasi extends Model
{
    protected $table = 'riwayat_negosiasi';

    protected $fillable = ['sesi_negosiasi_id', 'user_id', 'aksi', 'keterangan'];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
