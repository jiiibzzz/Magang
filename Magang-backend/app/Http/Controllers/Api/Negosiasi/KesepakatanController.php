<?php

namespace App\Http\Controllers\Api\Negosiasi;

use App\Models\VersiPenawaran;
use App\Services\Negosiasi\KesepakatanService;
use App\Services\Negosiasi\NegosiasiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Use case: Setujui Kesepakatan (customer).
 */
class KesepakatanController extends NegosiasiBaseController
{
    public function __construct(NegosiasiService $negosiasi, private KesepakatanService $kesepakatan)
    {
        parent::__construct($negosiasi);
    }

    public function setujui(Request $request, $id)
    {
        $data = $request->validate([
            'versi_penawaran_id' => 'required|integer',
        ]);

        $user = $request->user();

        $versi = DB::transaction(function () use ($id, $user, $data) {
            $sesi = $this->sesi($id, $user, true);
            $this->hanyaCustomer($sesi, $user);
            $this->pastikanTahap($sesi, 'penawaran');

            $versi = VersiPenawaran::where('sesi_negosiasi_id', $sesi->id)
                ->lockForUpdate()
                ->find($data['versi_penawaran_id']);

            if (!$versi || $versi->status !== VersiPenawaran::STATUS_MENUNGGU || $versi->pihak !== VersiPenawaran::PIHAK_MARKETING) {
                abort(422, 'Penawaran ini sudah tidak aktif.');
            }

            return $versi;
        });

        $kesepakatan = $this->kesepakatan->kunciDanBuatDokumen($versi, $user);

        return response()->json([
            'message' => 'Kesepakatan tercapai. Proyek masuk tahap Proses Pengerjaan.',
            'kesepakatan' => $kesepakatan,
        ]);
    }
}
