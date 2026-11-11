<?php

namespace App\Http\Controllers\Api\Negosiasi;

use App\Http\Controllers\Controller;
use App\Models\SesiNegosiasi;
use App\Models\User;
use App\Services\Negosiasi\NegosiasiService;

abstract class NegosiasiBaseController extends Controller
{
    public function __construct(protected NegosiasiService $negosiasi)
    {
    }

    protected function isMarketing(User $user): bool
    {
        return $user->can('kelola_proyek');
    }

    /**
     * Ambil sesi dengan kunci baris (dipakai di dalam DB::transaction) lalu cek akses.
     */
    protected function sesi(int|string $id, User $user, bool $lock = false): SesiNegosiasi
    {
        $query = SesiNegosiasi::query();
        if ($lock) {
            $query->lockForUpdate();
        }
        $sesi = $query->findOrFail($id);

        if (!$this->isMarketing($user) && (int) $sesi->customer_id !== (int) $user->id) {
            abort(403, 'Anda tidak memiliki akses ke sesi negosiasi ini.');
        }

        return $sesi;
    }

    protected function hanyaCustomer(SesiNegosiasi $sesi, User $user): void
    {
        if ((int) $sesi->customer_id !== (int) $user->id) {
            abort(403, 'Aksi ini hanya dapat dilakukan oleh customer pemilik sesi.');
        }
    }

    protected function pastikanAktif(SesiNegosiasi $sesi): void
    {
        if (!$sesi->isAktif()) {
            abort(422, 'Sesi negosiasi sudah ditutup (status: ' . $sesi->status . ').');
        }
    }

    protected function pastikanTahap(SesiNegosiasi $sesi, string $tahap): void
    {
        $this->pastikanAktif($sesi);

        if ($sesi->tahap !== $tahap) {
            abort(422, 'Aksi ini hanya dapat dilakukan pada tahap ' . $tahap . ' (tahap saat ini: ' . $sesi->tahap . ').');
        }
    }
}
