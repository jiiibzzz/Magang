<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JawabanKebutuhan;
use App\Models\Negosiasi;
use App\Models\Notifikasi;
use App\Models\PertanyaanKebutuhan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Tahap 1 Sistem Negosiasi: pengumpulan kebutuhan proyek.
 *
 * Alur:
 *   menyusun_pertanyaan --(marketing kirim pertanyaan)--> menunggu_jawaban
 *   menunggu_jawaban    --(customer menjawab semua)---> peninjauan_jawaban
 *   peninjauan_jawaban  --(belum lengkap: tanya lagi)--> menunggu_jawaban (putaran + 1)
 *   peninjauan_jawaban  --(kebutuhan lengkap)---------> rancangan_proyek
 *
 * Aturan akses:
 *   - Customer hanya bisa melihat dan menjawab negosiasi miliknya sendiri.
 *   - Marketing (punya permission kelola_negosiasi) bisa melihat semua negosiasi
 *     dan melakukan aksi marketing.
 *   - Hanya customer yang bisa membatalkan negosiasi.
 */
class NegosiasiController extends Controller
{
    /** Relasi yang dimuat saat menampilkan detail negosiasi. */
    private const RELASI_DETAIL = [
        'penawaran',
        'customer:id,name,email,phone',
        'marketing:id,name,email',
        'chatSession:id,status',
        'pertanyaanKebutuhans.jawaban',
        'rancanganTerbaru.deliverables',
        'tawaranTerbaru',
        'kesepakatan',
    ];

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Negosiasi::with(['penawaran:id,judul,harga', 'customer:id,name', 'marketing:id,name']);

        if ($this->isCustomer($user)) {
            $query->where('customer_id', $user->id);
        } elseif (! $user->can('kelola_negosiasi')) {
            return response()->json(['message' => 'Anda tidak memiliki akses ke data negosiasi.'], 403);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->latest()->paginate(10));
    }

    public function show(Request $request, $id)
    {
        $negosiasi = Negosiasi::findOrFail($id);

        if ($tolak = $this->tolakJikaBukanPihak($request, $negosiasi)) {
            return $tolak;
        }

        $this->tandaiKedaluwarsaJikaPerlu($negosiasi);

        return response()->json($negosiasi->load(self::RELASI_DETAIL));
    }

    /**
     * Marketing mengirim satu putaran pertanyaan kebutuhan.
     * Dipakai untuk putaran pertama maupun pertanyaan lanjutan
     * saat jawaban belum lengkap.
     */
    public function kirimPertanyaan(Request $request, $id)
    {
        $negosiasi = Negosiasi::findOrFail($id);

        if ($tolak = $this->tolakJikaTahapSalah($negosiasi, [
            Negosiasi::TAHAP_MENYUSUN_PERTANYAAN,
            Negosiasi::TAHAP_PENINJAUAN_JAWABAN,
        ])) {
            return $tolak;
        }

        $request->validate([
            'pertanyaan' => 'required|array|min:1|max:20',
            'pertanyaan.*' => 'required|string|max:2000',
        ]);

        DB::transaction(function () use ($negosiasi, $request) {
            // Putaran pertama memakai nomor yang sudah ada (1).
            // Kalau marketing bertanya lagi setelah meninjau jawaban, putaran naik satu.
            $putaran = $negosiasi->tahap === Negosiasi::TAHAP_PENINJAUAN_JAWABAN
                ? $negosiasi->putaran_pertanyaan + 1
                : $negosiasi->putaran_pertanyaan;

            foreach (array_values($request->pertanyaan) as $i => $isi) {
                PertanyaanKebutuhan::create([
                    'negosiasi_id' => $negosiasi->id,
                    'putaran' => $putaran,
                    'urutan' => $i + 1,
                    'isi_pertanyaan' => $isi,
                ]);
            }

            $negosiasi->update([
                'putaran_pertanyaan' => $putaran,
                'tahap' => Negosiasi::TAHAP_MENUNGGU_JAWABAN,
                'batas_respons' => now()->addDays(config('negosiasi.batas_respons_hari')),
            ]);

            $this->kirimNotifikasi(
                $negosiasi,
                $negosiasi->customer_id,
                'Pertanyaan kebutuhan proyek',
                'Marketing mengirim ' . count($request->pertanyaan) . ' pertanyaan (putaran ' . $putaran . '). '
                    . 'Mohon dijawab sebelum ' . $negosiasi->batas_respons->format('d-m-Y H:i') . '.'
            );
        });

        return response()->json($negosiasi->fresh()->load(self::RELASI_DETAIL), 201);
    }

    /**
     * Customer menjawab SEMUA pertanyaan pada putaran yang sedang berjalan
     * dalam satu kali kirim.
     */
    public function kirimJawaban(Request $request, $id)
    {
        $negosiasi = Negosiasi::findOrFail($id);
        $user = $request->user();

        if ((int) $user->id !== (int) $negosiasi->customer_id) {
            return response()->json(['message' => 'Hanya customer pada negosiasi ini yang dapat menjawab.'], 403);
        }

        if ($this->tandaiKedaluwarsaJikaPerlu($negosiasi)) {
            return response()->json(['message' => 'Batas waktu menjawab sudah lewat. Negosiasi ini kedaluwarsa.'], 409);
        }

        if ($tolak = $this->tolakJikaTahapSalah($negosiasi, [Negosiasi::TAHAP_MENUNGGU_JAWABAN])) {
            return $tolak;
        }

        $request->validate([
            'jawaban' => 'required|array|min:1',
            'jawaban.*.pertanyaan_id' => 'required|integer|distinct',
            'jawaban.*.isi_jawaban' => 'required|string|max:5000',
        ]);

        $pertanyaanPutaranIni = PertanyaanKebutuhan::where('negosiasi_id', $negosiasi->id)
            ->where('putaran', $negosiasi->putaran_pertanyaan)
            ->pluck('id')
            ->map(fn ($v) => (int) $v)
            ->sort()
            ->values();

        $dijawab = collect($request->jawaban)->pluck('pertanyaan_id')->map(fn ($v) => (int) $v)->sort()->values();

        if ($pertanyaanPutaranIni->all() !== $dijawab->all()) {
            return response()->json([
                'message' => 'Semua pertanyaan pada putaran ini harus dijawab, dan hanya pertanyaan putaran ini.',
                'pertanyaan_id_yang_diharapkan' => $pertanyaanPutaranIni,
            ], 422);
        }

        DB::transaction(function () use ($negosiasi, $request) {
            foreach ($request->jawaban as $item) {
                JawabanKebutuhan::create([
                    'pertanyaan_kebutuhan_id' => $item['pertanyaan_id'],
                    'isi_jawaban' => $item['isi_jawaban'],
                ]);
            }

            $negosiasi->update([
                'tahap' => Negosiasi::TAHAP_PENINJAUAN_JAWABAN,
                'batas_respons' => null,
            ]);

            $this->kirimNotifikasi(
                $negosiasi,
                $negosiasi->marketing_id,
                'Customer sudah menjawab',
                'Jawaban putaran ' . $negosiasi->putaran_pertanyaan . ' sudah masuk. Periksa apakah kebutuhan sudah lengkap.'
            );
        });

        return response()->json($negosiasi->fresh()->load(self::RELASI_DETAIL));
    }

    /** Marketing menyatakan kebutuhan sudah lengkap; lanjut ke penyusunan rancangan proyek. */
    public function kebutuhanLengkap(Request $request, $id)
    {
        $negosiasi = Negosiasi::findOrFail($id);

        if ($tolak = $this->tolakJikaTahapSalah($negosiasi, [Negosiasi::TAHAP_PENINJAUAN_JAWABAN])) {
            return $tolak;
        }

        $negosiasi->update(['tahap' => Negosiasi::TAHAP_RANCANGAN_PROYEK]);

        $this->kirimNotifikasi(
            $negosiasi,
            $negosiasi->customer_id,
            'Kebutuhan proyek lengkap',
            'Terima kasih. Marketing sedang menyusun ruang lingkup, timeline, dan estimasi biaya proyek.'
        );

        return response()->json($negosiasi->fresh()->load(self::RELASI_DETAIL));
    }

    /** Customer membatalkan negosiasi. Marketing sengaja tidak diberi aksi ini. */
    public function batalkan(Request $request, $id)
    {
        $negosiasi = Negosiasi::findOrFail($id);

        if ((int) $request->user()->id !== (int) $negosiasi->customer_id) {
            return response()->json(['message' => 'Hanya customer yang dapat membatalkan negosiasi.'], 403);
        }

        if (! $negosiasi->isAktif()) {
            return response()->json(['message' => 'Negosiasi ini sudah tidak aktif.'], 409);
        }

        $request->validate([
            'alasan' => 'required|string|max:1000',
        ]);

        $negosiasi->update([
            'status' => Negosiasi::STATUS_GAGAL,
            'alasan_penutupan' => $request->alasan,
            'batas_respons' => null,
            'ditutup_at' => now(),
        ]);

        $this->kirimNotifikasi(
            $negosiasi,
            $negosiasi->marketing_id,
            'Negosiasi dibatalkan customer',
            'Alasan: ' . $request->alasan
        );

        return response()->json($negosiasi->fresh()->load(self::RELASI_DETAIL));
    }

    // ------------------------------------------------------------------
    // Bantuan
    // ------------------------------------------------------------------

    private function isCustomer($user): bool
    {
        return $user->hasRole('customer');
    }

    /** 403 kalau user bukan customer pemilik dan bukan marketing. */
    private function tolakJikaBukanPihak(Request $request, Negosiasi $negosiasi)
    {
        $user = $request->user();

        if ($this->isCustomer($user)) {
            return (int) $user->id === (int) $negosiasi->customer_id
                ? null
                : response()->json(['message' => 'Negosiasi ini bukan milik Anda.'], 403);
        }

        return $user->can('kelola_negosiasi')
            ? null
            : response()->json(['message' => 'Anda tidak memiliki akses ke data negosiasi.'], 403);
    }

    /** 409 kalau negosiasi tidak aktif atau tidak berada di tahap yang diizinkan. */
    private function tolakJikaTahapSalah(Negosiasi $negosiasi, array $tahapDiizinkan)
    {
        if (! $negosiasi->isAktif()) {
            return response()->json(['message' => 'Negosiasi ini sudah tidak aktif (status: ' . $negosiasi->status . ').'], 409);
        }

        if (! in_array($negosiasi->tahap, $tahapDiizinkan, true)) {
            return response()->json([
                'message' => 'Aksi ini tidak dapat dilakukan pada tahap "' . $negosiasi->tahap . '".',
                'tahap_saat_ini' => $negosiasi->tahap,
                'tahap_yang_diizinkan' => $tahapDiizinkan,
            ], 409);
        }

        return null;
    }

    /**
     * Kalau batas respons sudah lewat, ubah status menjadi kedaluwarsa.
     * Pemeriksaan ini dilakukan saat negosiasi dibuka atau dijawab;
     * pemeriksaan terjadwal (scheduler) menyusul di tahap berikutnya.
     */
    private function tandaiKedaluwarsaJikaPerlu(Negosiasi $negosiasi): bool
    {
        if (! $negosiasi->isKedaluwarsa()) {
            return false;
        }

        $negosiasi->update([
            'status' => Negosiasi::STATUS_KEDALUWARSA,
            'alasan_penutupan' => 'Customer tidak merespons sampai batas waktu.',
            'ditutup_at' => now(),
        ]);

        return true;
    }

    private function kirimNotifikasi(Negosiasi $negosiasi, int $userId, string $judul, string $pesan): void
    {
        Notifikasi::create([
            'negosiasi_id' => $negosiasi->id,
            'user_id' => $userId,
            'judul' => $judul,
            'pesan' => $pesan,
        ]);
    }
}
