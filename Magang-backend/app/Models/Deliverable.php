<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Deliverable extends Model
{
    protected $table = 'rancangan_deliverables';

    protected $fillable = ['rancangan_proyek_id', 'nama', 'target_tanggal'];

    protected $casts = ['target_tanggal' => 'date:Y-m-d'];
}
