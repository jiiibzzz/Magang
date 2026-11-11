<?php

namespace App\Services\Negosiasi;

use App\Models\DokumenKesepakatan;
use App\Models\JawabanKebutuhan;
use App\Models\Kesepakatan;
use App\Models\PengaturanSitus;
use App\Models\SesiNegosiasi;
use App\Models\User;
use App\Models\VersiPenawaran;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Use case "Buat Kontrak & Project Charter" (di-«include» oleh Setujui Kesepakatan
 * dan Tinjau Penawaran Balik).
 */
class KesepakatanService
{
    public function __construct(
        private NegosiasiService $negosiasi,
        private DokumenGenerator $generator,
    ) {
    }

    public function kunciDanBuatDokumen(VersiPenawaran $versi, ?User $user = null): Kesepakatan
    {
        $kesepakatan = DB::transaction(function () use ($versi, $user) {
            $versi->update(['status' => VersiPenawaran::STATUS_DITERIMA]);

            return $this->kunciKesepakatan($versi, $user);
        });

        $this->buatDokumen($kesepakatan);

        $sesi = $kesepakatan->sesi;
        $this->negosiasi->kirim($sesi, 'marketing', 'Kesepakatan tercapai dengan harga final ' . NegosiasiService::rupiah($kesepakatan->harga_final) . '. Dokumen kontrak & project charter siap diunduh.');
        $this->negosiasi->kirim($sesi, 'customer', 'Kesepakatan tercapai dengan harga final ' . NegosiasiService::rupiah($kesepakatan->harga_final) . '. Proyek masuk tahap Proses Pengerjaan.');

        return $kesepakatan->load('dokumen');
    }

    private function kunciKesepakatan(VersiPenawaran $versi, ?User $user): Kesepakatan
    {
        $sesi = SesiNegosiasi::with(['proyek.layanan', 'customer', 'marketing', 'pertanyaan.jawaban'])
            ->lockForUpdate()
            ->findOrFail($versi->sesi_negosiasi_id);

        $rancangan = $versi->rancangan ?? $sesi->rancanganTerbaru;
        $rancangan?->load(['deliverables', 'rincianBiaya']);

        $snapshot = $this->snapshot($sesi, $versi, $rancangan);

        $kesepakatan = Kesepakatan::create([
            'sesi_negosiasi_id' => $sesi->id,
            'versi_penawaran_id' => $versi->id,
            'harga_final' => $versi->harga,
            'snapshot' => $snapshot,
        ]);

        $sesi->update([
            'tahap' => SesiNegosiasi::TAHAP_KESEPAKATAN,
            'status' => SesiNegosiasi::STATUS_BERHASIL,
            'selesai_pada' => now(),
            'menunggu_respons_dari' => null,
            'batas_waktu_respons' => null,
        ]);

        $this->negosiasi->catat($sesi, $user, 'kesepakatan', 'Kesepakatan dikunci pada penawaran versi ' . $versi->versi . ' seharga ' . NegosiasiService::rupiah($versi->harga) . '.');

        $proyek = $sesi->proyek;
        $this->negosiasi->timelineProyek(
            $proyek,
            'Kesepakatan Negosiasi Tercapai',
            'Harga final ' . NegosiasiService::rupiah($versi->harga) . ' disepakati. Kontrak & project charter dibuat. Proyek masuk tahap Proses Pengerjaan.',
            [
                'status_proyek' => 'Proses Pengerjaan',
                'progress' => 70,
                'harga_kontrak' => $versi->harga,
                'alasan_penolakan' => null,
                'tanggal_mulai' => $rancangan?->tanggal_mulai?->format('Y-m-d') ?? ($proyek->tanggal_mulai ?: date('Y-m-d')),
                'tanggal_selesai' => $rancangan?->tanggal_selesai?->format('Y-m-d') ?? $proyek->tanggal_selesai,
            ]
        );

        return $kesepakatan;
    }

    /**
     * Membuat 4 file (kontrak & project charter, masing-masing docx & pdf).
     * Bila gagal, record tetap dibuat dengan file_path null dan dibuat ulang saat diunduh.
     */
    public function buatDokumen(Kesepakatan $kesepakatan): void
    {
        foreach (DokumenKesepakatan::JENIS as $jenis) {
            foreach (DokumenKesepakatan::FORMAT as $format) {
                $path = null;
                try {
                    $path = $this->generator->generate($kesepakatan, $jenis, $format);
                } catch (Throwable $e) {
                    Log::error("Gagal membuat dokumen {$jenis}.{$format} kesepakatan #{$kesepakatan->id}: " . $e->getMessage());
                }

                DokumenKesepakatan::updateOrCreate(
                    ['kesepakatan_id' => $kesepakatan->id, 'jenis' => $jenis, 'format' => $format],
                    ['file_path' => $path],
                );
            }
        }
    }

    private function snapshot(SesiNegosiasi $sesi, VersiPenawaran $versi, $rancangan): array
    {
        $setting = fn (string $kunci, string $default) => PengaturanSitus::where('kunci', $kunci)->value('nilai') ?: $default;

        $kebutuhan = $sesi->pertanyaan
            ->filter(fn ($p) => $p->jawaban && $p->jawaban->status === JawabanKebutuhan::STATUS_TERKIRIM)
            ->map(fn ($p) => ['pertanyaan' => $p->pertanyaan, 'jawaban' => $p->jawaban->isi])
            ->values()
            ->all();

        return [
            'nomor' => sprintf('KSP/%s/%04d', now()->format('Y/m'), $sesi->id),
            'nomor_file' => sprintf('%s-%04d', now()->format('Ymd'), $sesi->id),
            'tanggal' => now()->toDateString(),
            'perusahaan' => [
                'nama' => $setting('nama_perusahaan', config('app.name')),
                'alamat' => $setting('alamat', '-'),
            ],
            'proyek' => [
                'id' => $sesi->proyek->id,
                'nama' => $sesi->proyek->nama_proyek,
                'deskripsi' => $sesi->proyek->deskripsi_kebutuhan,
                'layanan' => $sesi->proyek->layanan?->title,
            ],
            'customer' => ['nama' => $sesi->customer->name, 'email' => $sesi->customer->email],
            'marketing' => ['nama' => $sesi->marketing->name, 'email' => $sesi->marketing->email],
            'rancangan' => $rancangan ? [
                'versi' => $rancangan->versi,
                'tujuan' => $rancangan->tujuan,
                'ruang_lingkup' => $rancangan->ruang_lingkup,
                'tanggal_mulai' => $rancangan->tanggal_mulai?->toDateString(),
                'tanggal_selesai' => $rancangan->tanggal_selesai?->toDateString(),
                'total_biaya' => (float) $rancangan->total_biaya,
                'risiko' => $rancangan->risiko,
                'deliverables' => $rancangan->deliverables->map(fn ($d) => [
                    'nama' => $d->nama,
                    'target_tanggal' => $d->target_tanggal?->toDateString(),
                ])->all(),
                'rincian_biaya' => $rancangan->rincianBiaya->map(fn ($b) => [
                    'item' => $b->item,
                    'jumlah' => $b->jumlah,
                    'harga_satuan' => (float) $b->harga_satuan,
                ])->all(),
            ] : null,
            'penawaran' => [
                'versi' => $versi->versi,
                'pihak' => $versi->pihak,
                'harga' => (float) $versi->harga,
                'catatan' => $versi->catatan,
            ],
            'harga_final' => (float) $versi->harga,
            'riwayat_penawaran' => $sesi->versiPenawaran()->get(['versi', 'pihak', 'harga', 'status'])->toArray(),
            'kebutuhan' => $kebutuhan,
        ];
    }
}
