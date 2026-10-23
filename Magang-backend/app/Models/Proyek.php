<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Proyek extends Model
{
    use HasFactory;

    protected $table = 'proyeks';

    protected $fillable = [
        'penawaran_id',
        'chat_session_id',
        'negosiasi_id',
        'customer_id',
        'layanan_id',
        'nama_proyek',
        'deskripsi_kebutuhan',
        'progress',
        'status_proyek',
        'alasan_penolakan',
        'tanggal_mulai',
        'tanggal_selesai',
        'timeline',
        'dokumentasi',
    ];

    protected $casts = [
        'timeline' => 'array',
        'dokumentasi' => 'array',
    ];

    public function penawaran()
    {
        return $this->belongsTo(Penawaran::class, 'penawaran_id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function chatSession()
    {
        return $this->belongsTo(ChatSession::class, 'chat_session_id');
    }

    public function negosiasi()
    {
        return $this->belongsTo(Negosiasi::class, 'negosiasi_id');
    }

    public function layanan()
    {
        return $this->belongsTo(Layanan::class, 'layanan_id', 'id_layanan');
    }
}
