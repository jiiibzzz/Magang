<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Kesepakatan extends Model
{
    use HasFactory;

    protected $table = 'kesepakatans';

    protected $fillable = [
        'negosiasi_id',
        'tawaran_harga_id',
        'harga_final',
        'snapshot',
        'hash',
        'dikunci_oleh',
        'disepakati_at',
    ];

    protected $casts = [
        'harga_final' => 'decimal:2',
        'snapshot' => 'array',
        'disepakati_at' => 'datetime',
    ];

    public function negosiasi()
    {
        return $this->belongsTo(Negosiasi::class, 'negosiasi_id');
    }

    public function tawaranHarga()
    {
        return $this->belongsTo(TawaranHarga::class, 'tawaran_harga_id');
    }

    public function pengunci()
    {
        return $this->belongsTo(User::class, 'dikunci_oleh');
    }

    public function dokumens()
    {
        return $this->hasMany(DokumenKesepakatan::class, 'kesepakatan_id');
    }

    /**
     * Hitung hash SHA-256 dari isi snapshot. Dipakai saat mengunci
     * kesepakatan dan saat memeriksa apakah snapshot masih utuh.
     */
    public static function hitungHash(array $snapshot): string
    {
        return hash('sha256', json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    /** True kalau isi snapshot masih sama dengan saat dikunci. */
    public function isUtuh(): bool
    {
        return hash_equals($this->hash, self::hitungHash($this->snapshot));
    }
}
