<?php

namespace App\Console\Commands;

use App\Models\FollowUpLog;
use App\Models\SesiNegosiasi;
use App\Services\Negosiasi\NegosiasiService;
use App\Services\Negosiasi\TutupSesiService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Use case: Follow Up Otomatis (aktor: Penjadwal Sistem).
 *
 * Mencari sesi aktif yang menunggu respons customer dan sudah melewati batas waktu.
 * - jumlah_follow_up < 3 : kirim pesan follow up ke chat customer, catat log, +1 hitungan, batas +3 hari.
 * - jumlah_follow_up = 3 : jalankan Tutup Sesi Tanpa Respons («extend»).
 */
class FollowUpNegosiasi extends Command
{
    protected $signature = 'negosiasi:follow-up';

    protected $description = 'Follow up otomatis sesi negosiasi yang melewati batas waktu respons customer';

    public function handle(NegosiasiService $negosiasi, TutupSesiService $tutupSesi): int
    {
        $ids = SesiNegosiasi::where('status', SesiNegosiasi::STATUS_AKTIF)
            ->where('menunggu_respons_dari', 'customer')
            ->whereNotNull('batas_waktu_respons')
            ->where('batas_waktu_respons', '<', now())
            ->pluck('id');

        $followUp = 0;
        $ditutup = 0;

        foreach ($ids as $id) {
            DB::transaction(function () use ($id, $negosiasi, $tutupSesi, &$followUp, &$ditutup) {
                $sesi = SesiNegosiasi::lockForUpdate()->find($id);

                // Status bisa berubah sejak query awal (customer merespons / sesi ditutup).
                if (!$sesi || !$sesi->isAktif() || $sesi->menunggu_respons_dari !== 'customer'
                    || !$sesi->batas_waktu_respons || $sesi->batas_waktu_respons->isFuture()) {
                    return;
                }

                if ($sesi->jumlah_follow_up >= SesiNegosiasi::MAKS_FOLLOW_UP) {
                    $tutupSesi->tutupSesiTanpaRespons($sesi);
                    $ditutup++;

                    return;
                }

                $ke = $sesi->jumlah_follow_up + 1;
                $batasBaru = now()->max($sesi->batas_waktu_respons)->addDays(SesiNegosiasi::HARI_PERPANJANG_FOLLOW_UP);

                $pesan = $negosiasi->kirim(
                    $sesi,
                    'customer',
                    '[Follow Up Otomatis ' . $ke . '/' . SesiNegosiasi::MAKS_FOLLOW_UP . '] Halo, kami masih menunggu tanggapan Anda pada sesi negosiasi proyek "'
                        . ($sesi->proyek?->nama_proyek ?? '-') . '" (tahap ' . $sesi->tahap . '). Mohon respons sebelum '
                        . $batasBaru->format('d/m/Y H:i') . '.',
                    false,
                );

                FollowUpLog::create([
                    'sesi_negosiasi_id' => $sesi->id,
                    'follow_up_ke' => $ke,
                    'chat_message_id' => $pesan?->id,
                ]);

                $sesi->update([
                    'jumlah_follow_up' => $ke,
                    'batas_waktu_respons' => $batasBaru,
                ]);

                $negosiasi->catat($sesi, null, 'follow_up', 'Follow up otomatis ke-' . $ke . ' terkirim. Batas respons baru: ' . $batasBaru->format('d/m/Y H:i') . '.');
                $negosiasi->kirim($sesi, 'marketing', 'Follow up otomatis ke-' . $ke . '/' . SesiNegosiasi::MAKS_FOLLOW_UP . ' terkirim ke customer.');

                $followUp++;
            });
        }

        $this->info("Follow up terkirim: {$followUp}, sesi ditutup: {$ditutup}.");

        return self::SUCCESS;
    }
}
