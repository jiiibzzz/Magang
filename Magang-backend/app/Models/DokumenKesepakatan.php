<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DokumenKesepakatan extends Model
{
    use HasFactory;

    protected $table = 'dokumen_kesepakatans';

    public const JENIS_KONTRAK = 'kontrak';
    public const JENIS_PROJECT_CHARTER = 'project_charter';

    public const FORMAT_DOCX = 'docx';
    public const FORMAT_PDF = 'pdf';

    protected $fillable = [
        'kesepakatan_id',
        'jenis',
        'format',
        'path_file',
    ];

    public function kesepakatan()
    {
        return $this->belongsTo(Kesepakatan::class, 'kesepakatan_id');
    }
}
