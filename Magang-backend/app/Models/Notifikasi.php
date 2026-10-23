<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notifikasi extends Model
{
    use HasFactory;

    protected $table = 'notifikasis';

    protected $fillable = [
        'negosiasi_id',
        'user_id',
        'judul',
        'pesan',
        'dibaca_at',
    ];

    protected $casts = [
        'dibaca_at' => 'datetime',
    ];

    public function negosiasi()
    {
        return $this->belongsTo(Negosiasi::class, 'negosiasi_id');
    }

    public function penerima()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function tandaiDibaca(): void
    {
        if ($this->dibaca_at === null) {
            $this->update(['dibaca_at' => now()]);
        }
    }
}
