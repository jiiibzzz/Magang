<?php

namespace App\Http\Controllers\Api\Negosiasi;

use App\Models\JawabanKebutuhan;
use App\Models\SesiNegosiasi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NegosiasiController extends NegosiasiBaseController
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = SesiNegosiasi::with([
            'proyek:id,nama_proyek,status_proyek,layanan_id',
            'customer:id,name,email',
            'marketing:id,name',
            'penawaranAktif',
        ]);

        if (!$this->isMarketing($user)) {
            $query->where('customer_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('proyek', fn ($p) => $p->where('nama_proyek', 'like', "%{$search}%"))
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        return response()->json($query->latest('updated_at')->paginate(10));
    }

    /**
     * Detail sesi: dipakai oleh halaman Sesi Negosiasi (marketing) dan Lihat Penawaran (customer).
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $sesi = $this->sesi($id, $user);
        $isMarketing = $this->isMarketing($user);

        $sesi->load([
            'proyek.layanan',
            'customer:id,name,email,phone',
            'marketing:id,name,email',
            'pertanyaan.jawaban',
            'rancangan.deliverables',
            'rancangan.rincianBiaya',
            'versiPenawaran',
            'permintaanPerubahan',
            'kesepakatan.dokumen',
            'followUpLogs',
            'riwayat.user:id,name',
        ]);

        // Marketing hanya boleh melihat jawaban yang sudah dikirim (bukan draf customer).
        if ($isMarketing && (int) $sesi->customer_id !== (int) $user->id) {
            $sesi->pertanyaan->each(function ($p) {
                if ($p->jawaban && $p->jawaban->status !== JawabanKebutuhan::STATUS_TERKIRIM) {
                    $p->setRelation('jawaban', null);
                }
            });
        }

        return response()->json([
            'sesi' => $sesi,
            'peran' => $isMarketing ? 'marketing' : 'customer',
        ]);
    }

    /**
     * Use case: Batalkan Negosiasi (customer).
     */
    public function batalkan(Request $request, $id)
    {
        $data = $request->validate([
            'alasan' => 'required|string|max:1000',
        ]);

        $user = $request->user();

        $sesi = DB::transaction(function () use ($id, $user, $data) {
            $sesi = $this->sesi($id, $user, true);
            $this->hanyaCustomer($sesi, $user);
            $this->pastikanAktif($sesi);

            $sesi->update([
                'status' => SesiNegosiasi::STATUS_GAGAL,
                'alasan_selesai' => 'Dibatalkan customer: ' . $data['alasan'],
                'selesai_pada' => now(),
                'menunggu_respons_dari' => null,
                'batas_waktu_respons' => null,
            ]);

            $sesi->versiPenawaran()->where('status', 'menunggu')->update(['status' => 'ditolak']);

            $this->negosiasi->catat($sesi, $user, 'dibatalkan', $data['alasan']);
            $this->negosiasi->timelineProyek($sesi->proyek, 'Negosiasi Dibatalkan Customer', 'Alasan: ' . $data['alasan'], [
                'status_proyek' => 'ditolak',
                'progress' => 0,
                'alasan_penolakan' => 'Negosiasi dibatalkan customer: ' . $data['alasan'],
            ]);

            return $sesi;
        });

        $this->negosiasi->kirim($sesi, 'marketing', 'Customer membatalkan negosiasi. Alasan: ' . $data['alasan']);

        return response()->json(['message' => 'Negosiasi dibatalkan.', 'sesi' => $sesi]);
    }
}
