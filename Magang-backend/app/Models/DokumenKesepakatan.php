<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DokumenKesepakatan extends Model
{
    public const JENIS = ['kontrak', 'project_charter'];
    public const FORMAT = ['docx', 'pdf'];

    protected $table = 'dokumen_kesepakatan';

    protected $fillable = ['kesepakatan_id', 'jenis', 'format', 'file_path'];

    protected $hidden = ['file_path'];

    protected $appends = ['tersedia'];

    public function getTersediaAttribute(): bool
    {
        return !empty($this->file_path);
    }

    public function kesepakatan()
    {
        return $this->belongsTo(Kesepakatan::class, 'kesepakatan_id');
    }
}
