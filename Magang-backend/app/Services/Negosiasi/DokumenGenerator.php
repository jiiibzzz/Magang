<?php

namespace App\Services\Negosiasi;

use App\Models\Kesepakatan;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\Shared\Html;

/**
 * Membuat dokumen Kontrak & Project Charter (Word / PDF) dari snapshot kesepakatan.
 */
class DokumenGenerator
{
    public const DISK = 'local';

    /**
     * @return string path file relatif terhadap disk local
     */
    public function generate(Kesepakatan $kesepakatan, string $jenis, string $format): string
    {
        $html = view('negosiasi.dokumen', [
            'jenis' => $jenis,
            's' => $kesepakatan->snapshot,
        ])->render();

        $path = sprintf('negosiasi/%d/%s_%s.%s', $kesepakatan->sesi_negosiasi_id, $jenis, $kesepakatan->snapshot['nomor_file'] ?? $kesepakatan->id, $format);

        $isi = $format === 'pdf' ? $this->pdf($html) : $this->docx($html);

        Storage::disk(self::DISK)->put($path, $isi);

        return $path;
    }

    private function pdf(string $html): string
    {
        $dokumen = '<html><head><meta charset="utf-8"><style>'
            . 'body{font-family:DejaVu Sans,sans-serif;font-size:11px;line-height:1.5;color:#111}'
            . 'h1{font-size:18px;margin-bottom:2px}h2{font-size:13px;margin:16px 0 4px}'
            . 'table{border-collapse:collapse}td{vertical-align:top}'
            . '</style></head><body>' . $html . '</body></html>';

        return Pdf::loadHTML($dokumen)->setPaper('a4')->output();
    }

    private function docx(string $html): string
    {
        // Fallback bila ekstensi php-zip tidak aktif (mis. PHP bawaan Laragon).
        if (!class_exists(\ZipArchive::class)) {
            Settings::setZipClass(Settings::PCLZIP);
        }

        $word = new PhpWord();
        $word->setDefaultFontName('Calibri');
        $word->setDefaultFontSize(11);

        $section = $word->addSection();
        Html::addHtml($section, $html, false, false);

        $tmp = tempnam(sys_get_temp_dir(), 'neg');
        IOFactory::createWriter($word, 'Word2007')->save($tmp);
        $isi = file_get_contents($tmp);
        @unlink($tmp);

        return $isi;
    }
}
