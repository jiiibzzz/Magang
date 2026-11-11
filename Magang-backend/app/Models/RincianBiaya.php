<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RincianBiaya extends Model
{
    protected $table = 'rancangan_rincian_biaya';

    protected $fillable = ['rancangan_proyek_id', 'item', 'jumlah', 'harga_satuan'];

    protected $casts = [
        'jumlah' => 'integer',
        'harga_satuan' => 'decimal:2',
    ];

    protected $appends = ['subtotal'];

    public function getSubtotalAttribute(): float
    {
        return (float) $this->jumlah * (float) $this->harga_satuan;
    }
}
