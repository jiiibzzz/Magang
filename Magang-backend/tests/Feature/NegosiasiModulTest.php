<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\DokumenKesepakatan;
use App\Models\Proyek;
use App\Models\SesiNegosiasi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class NegosiasiModulTest extends TestCase
{
    use RefreshDatabase;

    private User $marketing;
    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed');
        Storage::fake('local');

        $this->marketing = User::where('email', 'marketing@kurva.test')->first();
        $this->customer = User::role('customer')->first();
    }

    private function bukaSesi(): SesiNegosiasi
    {
        $proyek = Proyek::create([
            'customer_id' => $this->customer->id,
            'nama_proyek' => 'Aplikasi Kasir',
            'deskripsi_kebutuhan' => 'Aplikasi kasir multi cabang.',
            'status_proyek' => 'pengajuan',
            'progress' => 0,
            'timeline' => [],
            'dokumentasi' => [],
        ]);

        $this->actingAs($this->marketing, 'sanctum')
            ->putJson("/api/proyek/{$proyek->id}/validasi", ['aksi' => 'terima'])
            ->assertOk();

        $this->assertDatabaseHas('proyeks', ['id' => $proyek->id, 'status_proyek' => 'negosiasi']);

        return SesiNegosiasi::where('proyek_id', $proyek->id)->firstOrFail();
    }

    /** Menjalankan tahap kebutuhan sampai lengkap dan rancangan tersimpan. */
    private function sampaiTahapPenawaran(SesiNegosiasi $sesi): void
    {
        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/pertanyaan", [
                'pertanyaan' => ['Berapa jumlah cabang?', 'Perlu integrasi printer?'],
                'batas_waktu' => now()->addDays(3)->toDateTimeString(),
            ])->assertCreated();

        $pertanyaan = $sesi->pertanyaan()->get();

        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/jawaban", [
                'aksi' => 'kirim',
                'jawaban' => $pertanyaan->map(fn ($p) => ['pertanyaan_id' => $p->id, 'isi' => 'Jawaban ' . $p->urutan])->all(),
            ])->assertOk();

        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/periksa", ['hasil' => 'lengkap'])
            ->assertOk();

        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/rancangan", [
                'tujuan' => 'Digitalisasi transaksi kasir.',
                'ruang_lingkup' => 'Modul penjualan, stok, laporan.',
                'tanggal_mulai' => '2026-12-01',
                'tanggal_selesai' => '2027-02-28',
                'risiko' => 'Perubahan regulasi pajak.',
                'deliverables' => [['nama' => 'Aplikasi web', 'target_tanggal' => '2027-02-15']],
                'rincian_biaya' => [
                    ['item' => 'Pengembangan', 'jumlah' => 1, 'harga_satuan' => 40000000],
                    ['item' => 'Pelatihan', 'jumlah' => 2, 'harga_satuan' => 5000000],
                ],
            ])->assertCreated()
            ->assertJsonPath('rancangan.total_biaya', '50000000.00');
    }

    public function test_alur_lengkap_sampai_kesepakatan_dan_dokumen(): void
    {
        $sesi = $this->bukaSesi();
        $this->assertSame('kebutuhan', $sesi->tahap);
        $this->assertNotNull($sesi->chat_session_id);

        $this->sampaiTahapPenawaran($sesi);

        // Marketing membuat penawaran 55jt
        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/penawaran", [
                'harga' => 55000000,
                'catatan' => 'Termasuk garansi 3 bulan.',
                'batas_waktu' => now()->addDays(3)->toDateTimeString(),
            ])->assertCreated();

        // Customer menawar 45jt
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/penawaran-balik", ['harga' => 45000000, 'alasan' => 'Anggaran terbatas'])
            ->assertCreated();

        $balik = $sesi->versiPenawaran()->first();
        $this->assertSame('customer', $balik->pihak);

        // Marketing menolak, lalu kirim revisi 50jt
        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/penawaran/{$balik->id}/tinjau", ['keputusan' => 'tolak'])
            ->assertOk();

        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/penawaran", [
                'harga' => 50000000,
                'batas_waktu' => now()->addDays(3)->toDateTimeString(),
            ])->assertCreated();

        $revisi = $sesi->versiPenawaran()->first();
        $this->assertSame(3, $revisi->versi);

        // Customer menyetujui
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/setujui", ['versi_penawaran_id' => $revisi->id])
            ->assertOk();

        $sesi->refresh();
        $this->assertSame('berhasil', $sesi->status);
        $this->assertSame('kesepakatan', $sesi->tahap);

        $this->assertDatabaseHas('proyeks', [
            'id' => $sesi->proyek_id,
            'status_proyek' => 'Proses Pengerjaan',
            'harga_kontrak' => 50000000,
            'tanggal_mulai' => '2026-12-01',
        ]);

        // 4 dokumen (kontrak & charter × docx & pdf) berhasil dibuat
        $dokumen = DokumenKesepakatan::all();
        $this->assertCount(4, $dokumen);
        $this->assertTrue($dokumen->every(fn ($d) => $d->file_path && Storage::disk('local')->exists($d->file_path)));

        // Marketing mengunduh; file yang hilang dibuat ulang dari snapshot
        $pdf = $dokumen->firstWhere('format', 'pdf');
        Storage::disk('local')->delete($pdf->file_path);
        $this->actingAs($this->marketing, 'sanctum')
            ->get("/api/negosiasi/{$sesi->id}/dokumen/{$pdf->id}/unduh")
            ->assertOk()
            ->assertDownload();

        // Customer tidak boleh mengunduh (use case milik marketing)
        $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/negosiasi/{$sesi->id}/dokumen/{$pdf->id}/unduh")
            ->assertForbidden();

        // Sesi berhasil tidak bisa ditawar lagi
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/batalkan", ['alasan' => 'x'])
            ->assertStatus(422);
    }

    public function test_marketing_menerima_penawaran_balik(): void
    {
        $sesi = $this->bukaSesi();
        $this->sampaiTahapPenawaran($sesi);

        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/penawaran", ['harga' => 60000000, 'batas_waktu' => now()->addDay()->toDateTimeString()])
            ->assertCreated();
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/penawaran-balik", ['harga' => 52000000, 'alasan' => 'Nego'])
            ->assertCreated();

        $balik = $sesi->versiPenawaran()->first();
        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/penawaran/{$balik->id}/tinjau", ['keputusan' => 'terima'])
            ->assertOk();

        $this->assertDatabaseHas('proyeks', ['id' => $sesi->proyek_id, 'harga_kontrak' => 52000000, 'status_proyek' => 'Proses Pengerjaan']);
        $this->assertDatabaseHas('kesepakatan', ['sesi_negosiasi_id' => $sesi->id, 'harga_final' => 52000000]);
    }

    public function test_draf_jawaban_putaran_belum_lengkap_dan_perubahan_kebutuhan(): void
    {
        $sesi = $this->bukaSesi();

        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/pertanyaan", [
                'pertanyaan' => ['Target pengguna?'],
                'batas_waktu' => now()->addDays(2)->toDateTimeString(),
            ])->assertCreated();
        $p = $sesi->pertanyaan()->first();

        // Simpan draf boleh kosong, kirim tidak boleh kosong
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/jawaban", ['aksi' => 'draf', 'jawaban' => [['pertanyaan_id' => $p->id, 'isi' => 'UMKM']]])
            ->assertOk();
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/jawaban", ['aksi' => 'kirim', 'jawaban' => [['pertanyaan_id' => $p->id, 'isi' => '']]])
            ->assertStatus(422);

        // Marketing tidak melihat draf
        $this->actingAs($this->marketing, 'sanctum')
            ->getJson("/api/negosiasi/{$sesi->id}")
            ->assertJsonPath('sesi.pertanyaan.0.jawaban', null);

        // Periksa sebelum dikirim ditolak
        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/periksa", ['hasil' => 'lengkap'])
            ->assertStatus(422);

        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/jawaban", ['aksi' => 'kirim', 'jawaban' => [['pertanyaan_id' => $p->id, 'isi' => 'UMKM retail']]])
            ->assertOk();

        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/periksa", ['hasil' => 'belum_lengkap'])
            ->assertOk();
        $this->assertSame(2, $sesi->fresh()->putaran_kebutuhan);

        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/pertanyaan", [
                'pertanyaan' => ['Berapa jumlah user?'],
                'batas_waktu' => now()->addDays(2)->toDateTimeString(),
            ])->assertCreated();

        // Tahap rancangan tidak bisa dilompati
        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/penawaran", ['harga' => 1000, 'batas_waktu' => now()->addDay()->toDateTimeString()])
            ->assertStatus(422);
    }

    public function test_ajukan_perubahan_kebutuhan_kembali_ke_rancangan(): void
    {
        $sesi = $this->bukaSesi();
        $this->sampaiTahapPenawaran($sesi);

        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/penawaran", ['harga' => 50000000, 'batas_waktu' => now()->addDay()->toDateTimeString()])
            ->assertCreated();

        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/perubahan", ['isi_perubahan' => 'Tambah modul member.'])
            ->assertCreated();

        $sesi->refresh();
        $this->assertSame('rancangan', $sesi->tahap);
        $this->assertSame('ditolak', $sesi->versiPenawaran()->first()->status);
        $this->assertDatabaseHas('permintaan_perubahan', ['sesi_negosiasi_id' => $sesi->id]);
    }

    public function test_batalkan_negosiasi_dan_akses_customer_lain(): void
    {
        $sesi = $this->bukaSesi();

        $lain = User::create(['name' => 'Customer Lain', 'email' => 'lain@kurva.test', 'password' => 'password', 'status' => 'aktif']);
        $lain->assignRole('customer');

        $this->actingAs($lain, 'sanctum')->getJson("/api/negosiasi/{$sesi->id}")->assertForbidden();
        $this->actingAs($lain, 'sanctum')->postJson("/api/negosiasi/{$sesi->id}/batalkan", ['alasan' => 'x'])->assertForbidden();
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/pertanyaan", ['pertanyaan' => ['x'], 'batas_waktu' => now()->addDay()->toDateTimeString()])
            ->assertForbidden();

        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/batalkan", ['alasan' => 'Proyek ditunda'])
            ->assertOk();

        $this->assertSame('gagal', $sesi->fresh()->status);
        $this->assertDatabaseHas('proyeks', ['id' => $sesi->proyek_id, 'status_proyek' => 'ditolak']);
    }

    public function test_follow_up_otomatis_tiga_kali_lalu_sesi_ditutup(): void
    {
        $sesi = $this->bukaSesi();

        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/pertanyaan", [
                'pertanyaan' => ['Kapan target rilis?'],
                'batas_waktu' => now()->addHour()->toDateTimeString(),
            ])->assertCreated();

        // Belum lewat batas → tidak ada follow up
        $this->artisan('negosiasi:follow-up')->assertSuccessful();
        $this->assertSame(0, $sesi->fresh()->jumlah_follow_up);

        for ($i = 1; $i <= 3; $i++) {
            $this->travel(4)->days();
            $this->artisan('negosiasi:follow-up')->assertSuccessful();
            $this->assertSame($i, $sesi->fresh()->jumlah_follow_up);
            $this->assertSame('aktif', $sesi->fresh()->status);
        }

        $this->assertDatabaseCount('follow_up_logs', 3);
        $this->assertTrue(ChatMessage::where('chat_session_id', $sesi->chat_session_id)
            ->where('message', 'like', '[Follow Up Otomatis 3/3]%')->exists());

        $this->travel(4)->days();
        $this->artisan('negosiasi:follow-up')->assertSuccessful();

        $sesi->refresh();
        $this->assertSame('ditutup', $sesi->status);
        $this->assertDatabaseHas('proyeks', ['id' => $sesi->proyek_id, 'status_proyek' => 'ditolak']);

        // Customer tidak bisa menjawab sesi yang sudah ditutup
        $p = $sesi->pertanyaan()->first();
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/jawaban", ['aksi' => 'kirim', 'jawaban' => [['pertanyaan_id' => $p->id, 'isi' => 'Telat']]])
            ->assertStatus(422);
    }

    public function test_jawaban_customer_mereset_hitungan_follow_up(): void
    {
        $sesi = $this->bukaSesi();

        $this->actingAs($this->marketing, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/pertanyaan", [
                'pertanyaan' => ['Anggaran?'],
                'batas_waktu' => now()->addHour()->toDateTimeString(),
            ])->assertCreated();

        $this->travel(2)->hours();
        $this->artisan('negosiasi:follow-up');
        $this->assertSame(1, $sesi->fresh()->jumlah_follow_up);

        $p = $sesi->pertanyaan()->first();
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/negosiasi/{$sesi->id}/jawaban", ['aksi' => 'kirim', 'jawaban' => [['pertanyaan_id' => $p->id, 'isi' => '50 juta']]])
            ->assertOk();

        $sesi->refresh();
        $this->assertSame(0, $sesi->jumlah_follow_up);
        $this->assertSame('marketing', $sesi->menunggu_respons_dari);
    }
}
