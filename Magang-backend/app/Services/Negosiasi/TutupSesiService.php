<?php

namespace App\Services\Negosiasi;

use App\Models\SesiNegosiasi;

/**
 * Use case "Tutup Sesi Tanpa Respons" («extend» dari Follow Up Otomatis).
 */
class TutupSesiService
{
    public function __construct(private NegosiasiService $negosiasi)
    {
    }

    public function tutupSesiTanpaRespons(SesiNegosiasi $sesi): void
    {
        $alasan = 'Tidak ada respons dari customer setelah ' . $sesi->jumlah_follow_up . ' kali follow up.';

        $sesi->update([
            'status' => SesiNegosiasi::STATUS_DITUTUP,
            'alasan_selesai' => $alasan,
            'selesai_pada' => now(),
            'menunggu_respons_dari' => null,
            'batas_waktu_respons' => null,
        ]);

        $this->negosiasi->catat($sesi, null, 'sesi_ditutup', $alasan);

        if ($proyek = $sesi->proyek) {
            $this->negosiasi->timelineProyek($proyek, 'Sesi Negosiasi Ditutup', $alasan, [
                'status_proyek' => 'ditolak',
                'progress' => 0,
                'alasan_penolakan' => $alasan,
            ]);
        }

        $pesan = 'Sesi negosiasi ditutup karena tidak ada respons (' . $sesi->jumlah_follow_up . '/' . SesiNegosiasi::MAKS_FOLLOW_UP . ' follow up).';
        $this->negosiasi->kirim($sesi, 'customer', $pesan);
        $this->negosiasi->kirim($sesi, 'marketing', $pesan);
    }
}
