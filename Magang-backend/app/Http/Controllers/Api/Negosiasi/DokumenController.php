<?php

namespace App\Http\Controllers\Api\Negosiasi;

use App\Models\DokumenKesepakatan;
use App\Services\Negosiasi\DokumenGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Use case: Unduh Kontrak & Project Charter (marketing).
 */
class DokumenController extends NegosiasiBaseController
{
    public function unduh(Request $request, $id, $dokumenId, DokumenGenerator $generator)
    {
        $sesi = $this->sesi($id, $request->user());

        $dokumen = DokumenKesepakatan::with('kesepakatan')
            ->whereHas('kesepakatan', fn ($q) => $q->where('sesi_negosiasi_id', $sesi->id))
            ->findOrFail($dokumenId);

        $disk = Storage::disk(DokumenGenerator::DISK);

        // File belum ada / gagal dibuat → generate ulang dari snapshot kesepakatan.
        if (!$dokumen->file_path || !$disk->exists($dokumen->file_path)) {
            try {
                $dokumen->update(['file_path' => $generator->generate($dokumen->kesepakatan, $dokumen->jenis, $dokumen->format)]);
            } catch (Throwable $e) {
                report($e);

                return response()->json(['message' => 'Dokumen gagal dibuat. Silakan coba lagi.'], 500);
            }
        }

        $nama = sprintf(
            '%s - %s.%s',
            $dokumen->jenis === 'kontrak' ? 'Kontrak' : 'Project Charter',
            $dokumen->kesepakatan->snapshot['proyek']['nama'] ?? 'Proyek',
            $dokumen->format,
        );

        return $disk->download($dokumen->file_path, preg_replace('/[\\\\\/:*?"<>|]/', '-', $nama));
    }
}
