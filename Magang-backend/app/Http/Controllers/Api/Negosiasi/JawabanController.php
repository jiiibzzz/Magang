<?php

namespace App\Http\Controllers\Api\Negosiasi;

use App\Models\JawabanKebutuhan;
use App\Models\PertanyaanKebutuhan;
use App\Models\SesiNegosiasi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Use case: Jawab Pertanyaan Kebutuhan (customer) & Periksa Jawaban (marketing).
 */
class JawabanController extends NegosiasiBaseController
{
    public function simpan(Request $request, $id)
    {
        $data = $request->validate([
            'aksi' => 'required|in:draf,kirim',
            'jawaban' => 'required|array|min:1',
            'jawaban.*.pertanyaan_id' => 'required|integer',
            'jawaban.*.isi' => 'nullable|string|max:5000',
        ]);

        $user = $request->user();
        $kirim = $data['aksi'] === 'kirim';

        $sesi = DB::transaction(function () use ($id, $user, $data, $kirim) {
            $sesi = $this->sesi($id, $user, true);
            $this->hanyaCustomer($sesi, $user);
            $this->pastikanTahap($sesi, 'kebutuhan');

            $pertanyaan = PertanyaanKebutuhan::with('jawaban')
                ->where('sesi_negosiasi_id', $sesi->id)
                ->where('putaran', $sesi->putaran_kebutuhan)
                ->get()
                ->keyBy('id');

            if ($pertanyaan->isEmpty()) {
                abort(422, 'Belum ada pertanyaan kebutuhan pada putaran ini.');
            }

            if ($pertanyaan->contains(fn ($p) => $p->jawaban?->status === JawabanKebutuhan::STATUS_TERKIRIM)) {
                abort(422, 'Jawaban putaran ini sudah dikirim dan tidak dapat diubah.');
            }

            $isian = collect($data['jawaban'])->keyBy('pertanyaan_id');
            if ($isian->keys()->diff($pertanyaan->keys())->isNotEmpty()) {
                abort(422, 'Terdapat pertanyaan yang bukan milik putaran ini.');
            }

            if ($kirim) {
                $kosong = $pertanyaan->keys()->filter(fn ($pid) => trim((string) ($isian[$pid]['isi'] ?? '')) === '');
                if ($kosong->isNotEmpty()) {
                    abort(422, 'Semua pertanyaan wajib dijawab sebelum dikirim.');
                }
            }

            foreach ($isian as $pid => $row) {
                JawabanKebutuhan::updateOrCreate(
                    ['pertanyaan_kebutuhan_id' => $pid],
                    [
                        'isi' => $row['isi'] ?? null,
                        'status' => $kirim ? JawabanKebutuhan::STATUS_TERKIRIM : JawabanKebutuhan::STATUS_DRAF,
                    ],
                );
            }

            if ($kirim) {
                $sesi->update([
                    'jumlah_follow_up' => 0,
                    'menunggu_respons_dari' => 'marketing',
                    'batas_waktu_respons' => null,
                ]);
                $this->negosiasi->catat($sesi, $user, 'jawaban_dikirim', 'Jawaban putaran ke-' . $sesi->putaran_kebutuhan . ' dikirim.');
            }

            return $sesi;
        });

        if ($kirim) {
            $this->negosiasi->kirim($sesi, 'marketing', 'Jawaban kebutuhan putaran ke-' . $sesi->putaran_kebutuhan . ' telah masuk dari customer.');
        }

        return response()->json([
            'message' => $kirim ? 'Jawaban terkirim.' : 'Draf jawaban tersimpan.',
            'sesi' => $sesi,
        ]);
    }

    public function periksa(Request $request, $id)
    {
        $data = $request->validate([
            'hasil' => 'required|in:lengkap,belum_lengkap',
            'catatan' => 'nullable|string|max:2000',
        ]);

        $user = $request->user();

        $sesi = DB::transaction(function () use ($id, $user, $data) {
            $sesi = $this->sesi($id, $user, true);
            $this->pastikanTahap($sesi, 'kebutuhan');

            $pertanyaan = PertanyaanKebutuhan::with('jawaban')
                ->where('sesi_negosiasi_id', $sesi->id)
                ->where('putaran', $sesi->putaran_kebutuhan)
                ->get();

            $semuaTerkirim = $pertanyaan->isNotEmpty()
                && $pertanyaan->every(fn ($p) => $p->jawaban?->status === JawabanKebutuhan::STATUS_TERKIRIM);
            if (!$semuaTerkirim) {
                abort(422, 'Jawaban customer untuk putaran ini belum dikirim.');
            }

            $catatan = !empty($data['catatan']) ?' Catatan: ' . $data['catatan'] : '';

            if ($data['hasil'] === 'lengkap') {
                $sesi->update(['tahap' => SesiNegosiasi::TAHAP_RANCANGAN, 'menunggu_respons_dari' => 'marketing']);
                $this->negosiasi->catat($sesi, $user, 'jawaban_lengkap', 'Kebutuhan dinyatakan lengkap.' . $catatan);
            } else {
                $sesi->update(['putaran_kebutuhan' => $sesi->putaran_kebutuhan + 1, 'menunggu_respons_dari' => 'marketing']);
                $this->negosiasi->catat($sesi, $user, 'jawaban_belum_lengkap', 'Kebutuhan belum lengkap, lanjut ke putaran ke-' . $sesi->putaran_kebutuhan . '.' . $catatan);
            }

            return $sesi;
        });

        return response()->json([
            'message' => $data['hasil'] === 'lengkap'
                ? 'Jawaban lengkap. Tahap sesi berpindah ke rancangan proyek.'
                : 'Jawaban belum lengkap. Silakan susun pertanyaan putaran berikutnya.',
            'sesi' => $sesi,
        ]);
    }
}
