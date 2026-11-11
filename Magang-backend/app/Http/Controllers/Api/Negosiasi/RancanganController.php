<?php

namespace App\Http\Controllers\Api\Negosiasi;

use App\Models\RancanganProyek;
use App\Models\SesiNegosiasi;
use App\Services\Negosiasi\NegosiasiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Use case: Input Rancangan Proyek (marketing).
 */
class RancanganController extends NegosiasiBaseController
{
    public function store(Request $request, $id)
    {
        $data = $request->validate([
            'tujuan' => 'required|string|max:5000',
            'ruang_lingkup' => 'required|string|max:10000',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'risiko' => 'nullable|string|max:5000',
            'deliverables' => 'required|array|min:1',
            'deliverables.*.nama' => 'required|string|max:255',
            'deliverables.*.target_tanggal' => 'nullable|date',
            'rincian_biaya' => 'required|array|min:1',
            'rincian_biaya.*.item' => 'required|string|max:255',
            'rincian_biaya.*.jumlah' => 'required|integer|min:1',
            'rincian_biaya.*.harga_satuan' => 'required|numeric|min:0',
        ], [
            'tanggal_selesai.after_or_equal' => 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
            'deliverables.required' => 'Minimal satu deliverable wajib diisi.',
            'rincian_biaya.required' => 'Minimal satu rincian biaya wajib diisi.',
        ]);

        $user = $request->user();

        [$sesi, $rancangan] = DB::transaction(function () use ($id, $user, $data) {
            $sesi = $this->sesi($id, $user, true);
            $this->pastikanTahap($sesi, 'rancangan');

            $total = collect($data['rincian_biaya'])->sum(fn ($b) => $b['jumlah'] * $b['harga_satuan']);
            $versi = (int) RancanganProyek::where('sesi_negosiasi_id', $sesi->id)->max('versi') + 1;

            $rancangan = RancanganProyek::create([
                'sesi_negosiasi_id' => $sesi->id,
                'versi' => $versi,
                'tujuan' => $data['tujuan'],
                'ruang_lingkup' => $data['ruang_lingkup'],
                'tanggal_mulai' => $data['tanggal_mulai'],
                'tanggal_selesai' => $data['tanggal_selesai'],
                'total_biaya' => $total,
                'risiko' => $data['risiko'] ?? null,
            ]);
            $rancangan->deliverables()->createMany($data['deliverables']);
            $rancangan->rincianBiaya()->createMany($data['rincian_biaya']);

            $sesi->update(['tahap' => SesiNegosiasi::TAHAP_PENAWARAN, 'menunggu_respons_dari' => 'marketing']);
            $this->negosiasi->catat($sesi, $user, 'rancangan_disimpan', 'Rancangan proyek versi ' . $versi . ' (total ' . NegosiasiService::rupiah($total) . ').');

            return [$sesi, $rancangan];
        });

        return response()->json([
            'message' => 'Rancangan proyek versi ' . $rancangan->versi . ' tersimpan. Lanjutkan dengan membuat penawaran harga.',
            'rancangan' => $rancangan->load(['deliverables', 'rincianBiaya']),
            'sesi' => $sesi,
        ], 201);
    }
}
