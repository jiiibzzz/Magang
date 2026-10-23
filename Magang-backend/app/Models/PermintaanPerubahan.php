<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PermintaanPerubahan extends Model
{
    use HasFactory;

    protected $table = 'permintaan_perubahans';

    public const STATUS_BARU = 'baru';
    public const STATUS_DITINDAKLANJUTI = 'ditindaklanjuti';

    protected $fillable = [
        'negosiasi_id',
        'deskripsi_perubahan',
        'status',
    ];

    public function negosiasi()
    {
        return $this->belongsTo(Negosiasi::class, 'negosiasi_id');
    }
}
