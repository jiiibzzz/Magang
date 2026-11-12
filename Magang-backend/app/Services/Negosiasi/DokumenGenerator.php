<?php

namespace App\Services\Negosiasi;

use App\Models\Kesepakatan;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\Shared\Html;
use PhpOffice\PhpWord\TemplateProcessor;

/**
 * Membuat dokumen Kontrak & Project Charter (Word / PDF) dari snapshot kesepakatan.
 *
 * - Kontrak: dibangun dari view negosiasi.dokumen.
 * - Project Charter: mengikuti template SKPL (resources/templates/project_charter.docx);
 *   versi Word mengisi template tersebut, versi PDF memakai tiruan tata letaknya.
 */
class DokumenGenerator
{
    public const DISK = 'local';

    /**
     * @return string path file relatif terhadap disk local
     */
    public function generate(Kesepakatan $kesepakatan, string $jenis, string $format): string
    {
        $s = $kesepakatan->snapshot;
        $path = sprintf('negosiasi/%d/%s_%s.%s', $kesepakatan->sesi_negosiasi_id, $jenis, $s['nomor_file'] ?? $kesepakatan->id, $format);

        $this->siapkanZip();

        if ($jenis === 'project_charter') {
            $data = ProjectCharterData::dari($s);
            $isi = $format === 'pdf'
                ? $this->pdf(view('negosiasi.project_charter', $data)->render(), '9px')
                : $this->charterDocx($data);
        } else {
            $html = view('negosiasi.dokumen', ['jenis' => $jenis, 's' => $s])->render();
            $isi = $format === 'pdf' ? $this->pdf($html) : $this->docx($html);
        }

        Storage::disk(self::DISK)->put($path, $isi);

        return $path;
    }

    /** Fallback bila ekstensi php-zip tidak aktif (mis. PHP bawaan Laragon). */
    private function siapkanZip(): void
    {
        if (!class_exists(\ZipArchive::class)) {
            Settings::setZipClass(Settings::PCLZIP);
        }
    }

    private function pdf(string $html, string $fontSize = '11px'): string
    {
        $dokumen = '<html><head><meta charset="utf-8"><style>'
            . 'body{font-family:DejaVu Sans,sans-serif;font-size:' . $fontSize . ';line-height:1.5;color:#111}'
            . 'h1{font-size:18px;margin-bottom:2px}h2{font-size:13px;margin:16px 0 4px}'
            . 'table{border-collapse:collapse}td{vertical-align:top}'
            . '</style></head><body>' . $html . '</body></html>';

        return Pdf::loadHTML($dokumen)->setPaper('a4')->output();
    }

    private function docx(string $html): string
    {
        $word = new PhpWord();
        $word->setDefaultFontName('Calibri');
        $word->setDefaultFontSize(11);

        $section = $word->addSection();
        Html::addHtml($section, $html, false, false);

        return $this->simpanSementara(fn ($tmp) => IOFactory::createWriter($word, 'Word2007')->save($tmp));
    }

    private function charterDocx(array $data): string
    {
        $tpl = new TemplateProcessor(resource_path(ProjectCharterData::TEMPLATE));

        $tpl->cloneRow('ms_nama', count($data['milestones']));
        foreach ($data['milestones'] as $i => $m) {
            $n = $i + 1;
            $tpl->setValue("ms_nama#{$n}", $this->xml($m['nama']));
            $tpl->setValue("ms_mulai#{$n}", $this->xml($m['mulai']));
            $tpl->setValue("ms_selesai#{$n}", $this->xml($m['selesai']));
        }

        $tpl->cloneRow('b_tipe', count($data['biaya']));
        foreach ($data['biaya'] as $i => $b) {
            $n = $i + 1;
            foreach (['tipe', 'nama', 'tarif', 'qty', 'durasi', 'jumlah'] as $k) {
                $tpl->setValue("b_{$k}#{$n}", $this->xml($b[$k]));
            }
        }

        foreach ($data['nilai'] as $k => $v) {
            $tpl->setValue($k, $this->xml($v));
        }

        return $this->simpanSementara(fn ($tmp) => $tpl->saveAs($tmp));
    }

    /** Escape teks untuk XML Word dan ubah baris baru menjadi line break. */
    private function xml(string $teks): string
    {
        $aman = htmlspecialchars($teks, ENT_QUOTES | ENT_XML1, 'UTF-8');

        return str_replace("\n", '</w:t><w:br/><w:t xml:space="preserve">', $aman);
    }

    private function simpanSementara(callable $tulis): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'neg');
        try {
            $tulis($tmp);

            return file_get_contents($tmp);
        } finally {
            @unlink($tmp);
        }
    }
}
