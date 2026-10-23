<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Penawaran extends Model
{
    use HasFactory;

    protected $table = 'penawarans';

    protected $fillable = [
        'marketing_id',
        'customer_id',
        'chat_session_id',
        'produk_id',
        'layanan_id',
        'judul',
        'deskripsi',
        'harga',
        'brosur_path',
        'status',
        'tanggal_deal',
    ];

    protected $casts = [
        'tanggal_deal' => 'datetime',
        'harga' => 'decimal:2',
    ];

    public function proyek()
    {
        return $this->hasOne(Proyek::class, 'penawaran_id');
    }

    public function chatSession()
    {
        return $this->belongsTo(ChatSession::class, 'chat_session_id');
    }

    public function negosiasi()
    {
        return $this->hasOne(Negosiasi::class, 'penawaran_id');
    }

    public function marketing()
    {
        return $this->belongsTo(User::class, 'marketing_id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id', 'id_produk');
    }

    public function layanan()
    {
        return $this->belongsTo(Layanan::class, 'layanan_id', 'id_layanan');
    }
}
