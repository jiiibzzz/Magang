<?php

namespace App\Http\Controllers\Api\Negosiasi;

use App\Models\PertanyaanKebutuhan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Use case: Susun Pertanyaan Kebutuhan (marketing).
 */
class PertanyaanController extends NegosiasiBaseController
{
    public function store(Request $request, $id)
    {
        $data = $request->validate([
            'pertanyaan' => 'required|array|min:1|max:30',
            'pertanyaan.*' => 'required|string|max:2000',
            'batas_waktu' => 'required|date|after:now',
        ], [
            'pertanyaan.*.required' => 'Setiap pertanyaan wajib diisi.',
            'batas_waktu.after' => 'Batas waktu respons harus setelah waktu sekarang.',
        ]);

        $user = $request->user();

        $sesi = DB::transaction(function () use ($id, $user, $data) {
            $sesi = $this->sesi($id, $user, true);
            $this->pastikanTahap($sesi, 'kebutuhan');

            $sudahAda = PertanyaanKebutuhan::where('sesi_negosiasi_id', $sesi->id)
                ->where('putaran', $sesi->putaran_kebutuhan)
                ->exists();
            if ($sudahAda) {
                abort(422, 'Pertanyaan untuk putaran ke-' . $sesi->putaran_kebutuhan . ' sudah dikirim.');
            }

            foreach (array_values($data['pertanyaan']) as $i => $isi) {
                PertanyaanKebutuhan::create([
                    'sesi_negosiasi_id' => $sesi->id,
                    'putaran' => $sesi->putaran_kebutuhan,
                    'urutan' => $i + 1,
                    'pertanyaan' => trim($isi),
                ]);
            }

            $sesi->update([
                'batas_waktu_respons' => $data['batas_waktu'],
                'menunggu_respons_dari' => 'customer',
                'jumlah_follow_up' => 0,
            ]);

            $this->negosiasi->catat($sesi, $user, 'pertanyaan_dikirim', count($data['pertanyaan']) . ' pertanyaan kebutuhan (putaran ke-' . $sesi->putaran_kebutuhan . ').');

            return $sesi;
        });

        $this->negosiasi->kirim($sesi, 'customer', 'Pertanyaan kebutuhan baru (putaran ke-' . $sesi->putaran_kebutuhan . ') menunggu jawaban Anda sebelum ' . $sesi->batas_waktu_respons->format('d/m/Y H:i') . '.');

        return response()->json(['message' => 'Pertanyaan kebutuhan terkirim.', 'sesi' => $sesi], 201);
    }
}
