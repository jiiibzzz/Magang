<?php

namespace App\Http\Controllers\Api\Negosiasi;

use App\Models\SesiNegosiasi;
use App\Models\VersiPenawaran;
use App\Services\Negosiasi\KesepakatanService;
use App\Services\Negosiasi\NegosiasiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Use case: Buat Penawaran Harga & Tinjau Penawaran Balik (marketing), Tawar Harga (customer).
 */
class PenawaranController extends NegosiasiBaseController
{
    public function __construct(NegosiasiService $negosiasi, private KesepakatanService $kesepakatan)
    {
        parent::__construct($negosiasi);
    }

    public function store(Request $request, $id)
    {
        $data = $request->validate([
            'harga' => 'required|numeric|min:1',
            'catatan' => 'nullable|string|max:2000',
            'batas_waktu' => 'required|date|after:now',
        ], [
            'batas_waktu.after' => 'Batas waktu respons harus setelah waktu sekarang.',
        ]);

        $user = $request->user();

        [$sesi, $versi] = DB::transaction(function () use ($id, $user, $data) {
            $sesi = $this->sesi($id, $user, true);
            $this->pastikanTahap($sesi, 'penawaran');

            if ($sesi->penawaranAktif()->exists()) {
                abort(422, 'Masih ada penawaran yang menunggu respons.');
            }

            $rancangan = $sesi->rancanganTerbaru;
            if (!$rancangan) {
                abort(422, 'Rancangan proyek belum dibuat.');
            }

            $versi = VersiPenawaran::create([
                'sesi_negosiasi_id' => $sesi->id,
                'rancangan_proyek_id' => $rancangan->id,
                'versi' => $this->versiBerikutnya($sesi),
                'pihak' => VersiPenawaran::PIHAK_MARKETING,
                'harga' => $data['harga'],
                'catatan' => $data['catatan'] ?? null,
                'status' => VersiPenawaran::STATUS_MENUNGGU,
            ]);

            $sesi->update([
                'batas_waktu_respons' => $data['batas_waktu'],
                'menunggu_respons_dari' => 'customer',
            ]);

            $this->negosiasi->catat($sesi, $user, 'penawaran_dibuat', 'Penawaran versi ' . $versi->versi . ': ' . NegosiasiService::rupiah($versi->harga) . '.');

            return [$sesi, $versi];
        });

        $this->negosiasi->kirim($sesi, 'customer', 'Penawaran harga baru (versi ' . $versi->versi . ') sebesar ' . NegosiasiService::rupiah($versi->harga) . ' menunggu tanggapan Anda sebelum ' . $sesi->batas_waktu_respons->format('d/m/Y H:i') . '.');

        return response()->json(['message' => 'Penawaran terkirim ke customer.', 'penawaran' => $versi, 'sesi' => $sesi], 201);
    }

    /**
     * Customer mengajukan penawaran balik (Tawar Harga).
     */
    public function storeBalik(Request $request, $id)
    {
        $data = $request->validate([
            'harga' => 'required|numeric|min:1',
            'alasan' => 'required|string|max:2000',
        ]);

        $user = $request->user();

        [$sesi, $versi] = DB::transaction(function () use ($id, $user, $data) {
            $sesi = $this->sesi($id, $user, true);
            $this->hanyaCustomer($sesi, $user);
            $this->pastikanTahap($sesi, 'penawaran');

            $aktif = $this->penawaranAktifDari($sesi, VersiPenawaran::PIHAK_MARKETING);
            $aktif->update(['status' => VersiPenawaran::STATUS_DITOLAK]);

            $versi = VersiPenawaran::create([
                'sesi_negosiasi_id' => $sesi->id,
                'rancangan_proyek_id' => $aktif->rancangan_proyek_id,
                'versi' => $this->versiBerikutnya($sesi),
                'pihak' => VersiPenawaran::PIHAK_CUSTOMER,
                'harga' => $data['harga'],
                'catatan' => $data['alasan'],
                'status' => VersiPenawaran::STATUS_MENUNGGU,
            ]);

            $sesi->update([
                'jumlah_follow_up' => 0,
                'menunggu_respons_dari' => 'marketing',
                'batas_waktu_respons' => null,
            ]);

            $this->negosiasi->catat($sesi, $user, 'penawaran_balik', 'Penawaran balik versi ' . $versi->versi . ': ' . NegosiasiService::rupiah($versi->harga) . '. Alasan: ' . $data['alasan']);

            return [$sesi, $versi];
        });

        $this->negosiasi->kirim($sesi, 'marketing', 'Customer mengajukan penawaran balik ' . NegosiasiService::rupiah($versi->harga) . '. Alasan: ' . $data['alasan']);

        return response()->json(['message' => 'Penawaran balik terkirim.', 'penawaran' => $versi, 'sesi' => $sesi], 201);
    }

    /**
     * Marketing meninjau penawaran balik customer (terima / tolak).
     */
    public function tinjau(Request $request, $id, $versiId)
    {
        $data = $request->validate([
            'keputusan' => 'required|in:terima,tolak',
            'catatan' => 'nullable|string|max:2000',
        ]);

        $user = $request->user();

        $versi = DB::transaction(function () use ($id, $versiId, $user, $data) {
            $sesi = $this->sesi($id, $user, true);
            $this->pastikanTahap($sesi, 'penawaran');

            $versi = $this->penawaranAktifDari($sesi, VersiPenawaran::PIHAK_CUSTOMER);
            if ((int) $versi->id !== (int) $versiId) {
                abort(422, 'Penawaran balik ini sudah tidak aktif.');
            }

            if ($data['keputusan'] === 'tolak') {
                $versi->update(['status' => VersiPenawaran::STATUS_DITOLAK]);
                $sesi->update(['tahap' => SesiNegosiasi::TAHAP_PENAWARAN, 'menunggu_respons_dari' => 'marketing']);
                $catatan = !empty($data['catatan']) ?' Catatan: ' . $data['catatan'] : '';
                $this->negosiasi->catat($sesi, $user, 'penawaran_balik_ditolak', 'Penawaran balik versi ' . $versi->versi . ' ditolak.' . $catatan);
            }

            return $versi;
        });

        if ($data['keputusan'] === 'terima') {
            $kesepakatan = $this->kesepakatan->kunciDanBuatDokumen($versi, $user);

            return response()->json(['message' => 'Penawaran balik diterima. Kesepakatan tercapai.', 'kesepakatan' => $kesepakatan]);
        }

        $this->negosiasi->kirim($versi->sesi, 'customer', 'Penawaran balik Anda (' . NegosiasiService::rupiah($versi->harga) . ') belum dapat diterima. Marketing akan mengirim penawaran revisi.');

        return response()->json(['message' => 'Penawaran balik ditolak. Silakan buat penawaran revisi.', 'penawaran' => $versi]);
    }

    private function versiBerikutnya(SesiNegosiasi $sesi): int
    {
        return (int) VersiPenawaran::where('sesi_negosiasi_id', $sesi->id)->max('versi') + 1;
    }

    private function penawaranAktifDari(SesiNegosiasi $sesi, string $pihak): VersiPenawaran
    {
        $aktif = VersiPenawaran::where('sesi_negosiasi_id', $sesi->id)
            ->where('status', VersiPenawaran::STATUS_MENUNGGU)
            ->latest('versi')
            ->lockForUpdate()
            ->first();

        if (!$aktif || $aktif->pihak !== $pihak) {
            abort(422, $pihak === VersiPenawaran::PIHAK_MARKETING
                ? 'Tidak ada penawaran aktif dari marketing.'
                : 'Tidak ada penawaran balik aktif dari customer.');
        }

        return $aktif;
    }
}
