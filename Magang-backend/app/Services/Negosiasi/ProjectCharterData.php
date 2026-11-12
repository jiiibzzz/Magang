<?php

namespace App\Services\Negosiasi;

use App\Models\PengaturanSitus;
use Illuminate\Support\Carbon;

/**
 * Memetakan snapshot kesepakatan ke isian template Project Charter (SKPL).
 * Dipakai bersama oleh versi Word (TemplateProcessor) dan PDF (Blade).
 */
class ProjectCharterData
{
    public const TEMPLATE = 'templates/project_charter.docx';

    public const JENIS_MANFAAT = [
        'SPECIFIC COST SAVINGS', 'ENHANCED REVENUES', 'HIGHER PRODUCTIVITY (SOFT)', 'IMPROVED COMPLIANCE',
        'BETTER DECISION MAKING', 'LESS MAINTENANCE', 'OTHER COSTS AVOIDED',
    ];

    /**
     * @return array{nilai: array<string,string>, milestones: list<array>, biaya: list<array>}
     */
    public static function dari(array $s): array
    {
        $r = $s['rancangan'] ?? [];
        $rp = fn ($v) => NegosiasiService::rupiah($v);
        $tgl = fn ($v) => $v ? Carbon::parse($v)->locale('id')->translatedFormat('d F Y') : '-';
        $isi = fn ($v) => trim((string) $v) !== '' ? trim((string) $v) : '-';

        $perusahaan = $s['perusahaan']['nama'] ?? config('app.name');
        $telepon = $s['perusahaan']['telepon'] ?? PengaturanSitus::where('kunci', 'no_telp')->value('nilai');
        $customer = $s['customer']['nama'] ?? '-';
        $marketing = $s['marketing']['nama'] ?? '-';
        $mulai = $r['tanggal_mulai'] ?? null;
        $selesai = $r['tanggal_selesai'] ?? null;
        $deliverables = $r['deliverables'] ?? [];

        $kebutuhan = collect($s['kebutuhan'] ?? [])
            ->map(fn ($k) => '• ' . $k['pertanyaan'] . ' — ' . $isi($k['jawaban'] ?? ''))
            ->implode("\n");

        $nilai = [
            'nama_proyek' => $s['proyek']['nama'] ?? '-',
            'sponsor' => $customer . ' (' . ($s['customer']['email'] ?? '-') . ')',
            'manajer' => $marketing,
            'email' => $s['marketing']['email'] ?? '-',
            'telepon' => $isi($telepon),
            'unit' => $perusahaan,
            'proses' => $isi($s['proyek']['layanan'] ?? ''),
            'mulai' => $tgl($mulai),
            'selesai' => $tgl($selesai),
            'penghematan' => '-',
            'estimasi_biaya' => $rp($s['harga_final'] ?? 0),
            'green_belt' => '-',
            'black_belt' => '-',
            'info_kesepakatan' => "INFORMASI KESEPAKATAN\n"
                . 'Nomor: ' . ($s['nomor'] ?? '-') . "\n"
                . 'Tanggal: ' . $tgl($s['tanggal'] ?? null) . "\n"
                . 'Harga final: ' . $rp($s['harga_final'] ?? 0) . "\n"
                . 'Penawaran versi ' . ($s['penawaran']['versi'] ?? '-') . ' (' . ($s['penawaran']['pihak'] ?? '-') . ")\n"
                . 'Rancangan versi ' . ($r['versi'] ?? '-'),

            'masalah' => $isi($s['proyek']['deskripsi'] ?? ''),
            'tujuan' => $isi($r['tujuan'] ?? ''),
            'business_case' => 'Nilai kontrak ' . $rp($s['harga_final'] ?? 0) . ' disepakati melalui negosiasi dari total rancangan '
                . $rp($r['total_biaya'] ?? 0) . '.' . ($kebutuhan ? "\nRingkasan kebutuhan:\n" . $kebutuhan : ''),
            'sasaran' => 'Seluruh deliverable diserahterimakan paling lambat ' . $tgl($selesai)
                . ' dengan anggaran ' . $rp($s['harga_final'] ?? 0) . '.',
            'deliverables' => $deliverables
                ? collect($deliverables)->values()->map(fn ($d, $i) => ($i + 1) . '. ' . $d['nama']
                    . (!empty($d['target_tanggal']) ? ' (target ' . $tgl($d['target_tanggal']) . ')' : ''))->implode("\n")
                : '-',
            'dalam_lingkup' => $isi($r['ruang_lingkup'] ?? ''),
            'luar_lingkup' => 'Pekerjaan di luar ruang lingkup di atas. Perubahan kebutuhan setelah kesepakatan dibahas ulang '
                . 'dan dapat memengaruhi jadwal serta biaya.',

            'tim' => 'Project manager / PIC: ' . $marketing . "\nTim pengembang " . $perusahaan,
            'sumber_daya' => $perusahaan . (!empty($s['perusahaan']['alamat']) && $s['perusahaan']['alamat'] !== '-' ? ' — ' . $s['perusahaan']['alamat'] : ''),
            'kebutuhan_khusus' => '-',

            'total_label' => 'Harga kesepakatan (total rancangan ' . $rp($r['total_biaya'] ?? 0) . ')',
            'total_biaya' => $rp($s['harga_final'] ?? 0),

            'pemilik_proses' => $customer,
            'stakeholder' => $customer . ' (customer), ' . $marketing . ' (marketing), ' . $perusahaan,
            'customer_akhir' => $customer,
            'manfaat' => $isi($r['tujuan'] ?? ''),

            'risiko' => $isi($r['risiko'] ?? ''),
            'batasan' => 'Anggaran ' . $rp($s['harga_final'] ?? 0) . '; tenggat serah terima ' . $tgl($selesai) . '.',
            'asumsi' => 'Kebutuhan mengacu pada hasil tanya-jawab kebutuhan dan rancangan proyek versi ' . ($r['versi'] ?? '-')
                . ' yang telah disepakati kedua pihak.',

            'disiapkan_oleh' => $marketing,
            'tanggal_dokumen' => $tgl($s['tanggal'] ?? null),
        ];

        foreach (self::JENIS_MANFAAT as $i => $_) {
            $nilai['manfaat_dasar_' . ($i + 1)] = '-';
            $nilai['manfaat_estimasi_' . ($i + 1)] = '-';
        }

        $milestones = [['nama' => 'Kick off & penandatanganan kontrak', 'mulai' => $tgl($mulai), 'selesai' => $tgl($mulai)]];
        foreach ($deliverables as $d) {
            $milestones[] = ['nama' => $d['nama'], 'mulai' => $tgl($mulai), 'selesai' => $tgl($d['target_tanggal'] ?? null)];
        }
        $milestones[] = ['nama' => 'Serah terima & penutupan proyek', 'mulai' => $tgl($selesai), 'selesai' => $tgl($selesai)];

        $biaya = collect($r['rincian_biaya'] ?? [])->values()->map(fn ($b, $i) => [
            'tipe' => 'ITEM ' . ($i + 1),
            'nama' => $b['item'],
            'tarif' => $rp($b['harga_satuan']),
            'qty' => (string) $b['jumlah'],
            'durasi' => '-',
            'jumlah' => $rp($b['jumlah'] * $b['harga_satuan']),
        ])->all();

        if (!$biaya) {
            $biaya = [['tipe' => '-', 'nama' => '-', 'tarif' => '-', 'qty' => '-', 'durasi' => '-', 'jumlah' => '-']];
        }

        return compact('nilai', 'milestones', 'biaya');
    }
}
