<?php

namespace App\Http\Controllers\Api\Negosiasi;

use App\Models\PermintaanPerubahan;
use App\Models\SesiNegosiasi;
use App\Models\VersiPenawaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Use case: Ajukan Perubahan Kebutuhan (customer).
 */
class PerubahanController extends NegosiasiBaseController
{
    public function store(Request $request, $id)
    {
        $data = $request->validate([
            'isi_perubahan' => 'required|string|max:5000',
        ]);

        $user = $request->user();

        $sesi = DB::transaction(function () use ($id, $user, $data) {
            $sesi = $this->sesi($id, $user, true);
            $this->hanyaCustomer($sesi, $user);
            $this->pastikanTahap($sesi, 'penawaran');

            $aktif = VersiPenawaran::where('sesi_negosiasi_id', $sesi->id)
                ->where('status', VersiPenawaran::STATUS_MENUNGGU)
                ->where('pihak', VersiPenawaran::PIHAK_MARKETING)
                ->lockForUpdate()
                ->first();

            if (!$aktif) {
                abort(422, 'Perubahan kebutuhan hanya dapat diajukan saat ada penawaran aktif dari marketing.');
            }

            PermintaanPerubahan::create([
                'sesi_negosiasi_id' => $sesi->id,
                'versi_penawaran_id' => $aktif->id,
                'isi_perubahan' => $data['isi_perubahan'],
            ]);

            $aktif->update(['status' => VersiPenawaran::STATUS_DITOLAK]);

            $sesi->update([
                'tahap' => SesiNegosiasi::TAHAP_RANCANGAN,
                'jumlah_follow_up' => 0,
                'menunggu_respons_dari' => 'marketing',
                'batas_waktu_respons' => null,
            ]);

            $this->negosiasi->catat($sesi, $user, 'perubahan_kebutuhan', $data['isi_perubahan']);

            return $sesi;
        });

        $this->negosiasi->kirim($sesi, 'marketing', 'Customer mengajukan perubahan kebutuhan: ' . $data['isi_perubahan']);

        return response()->json(['message' => 'Permintaan perubahan kebutuhan terkirim.', 'sesi' => $sesi], 201);
    }
}
