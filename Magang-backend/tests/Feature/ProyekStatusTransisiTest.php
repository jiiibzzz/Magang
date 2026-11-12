<?php

namespace Tests\Feature;

use App\Models\Proyek;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProyekStatusTransisiTest extends TestCase
{
    use RefreshDatabase;

    private User $marketing;
    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed');
        $this->marketing = User::where('email', 'marketing@kurva.test')->first();
        $this->customer = User::role('customer')->first();
    }

    private function proyek(string $status): Proyek
    {
        return Proyek::create([
            'customer_id' => $this->customer->id,
            'nama_proyek' => 'Proyek Uji Status',
            'deskripsi_kebutuhan' => 'Deskripsi.',
            'status_proyek' => $status,
            'progress' => 0,
            'timeline' => [],
            'dokumentasi' => [],
        ]);
    }

    private function ubahStatus(Proyek $proyek, string $status)
    {
        return $this->actingAs($this->marketing, 'sanctum')->putJson("/api/proyek/{$proyek->id}", [
            'nama_proyek' => $proyek->nama_proyek,
            'deskripsi_kebutuhan' => $proyek->deskripsi_kebutuhan,
            'progress' => 90,
            'status_proyek' => $status,
        ]);
    }

    public function test_status_pra_kesepakatan_tidak_bisa_diubah_manual(): void
    {
        foreach (['pengajuan', 'negosiasi', 'ditolak'] as $awal) {
            foreach (['Proses Pengerjaan', 'Selesai', 'Maintenance', 'Arsip'] as $tujuan) {
                $proyek = $this->proyek($awal);
                $this->ubahStatus($proyek, $tujuan)->assertStatus(422);
                $this->assertSame($awal, $proyek->fresh()->status_proyek, "{$awal} → {$tujuan} seharusnya ditolak");
            }
        }

        // pengajuan tidak bisa dilompat ke negosiasi tanpa membuka sesi
        $this->ubahStatus($this->proyek('pengajuan'), 'negosiasi')->assertStatus(422);
    }

    public function test_status_pasca_kesepakatan_bisa_berpindah_tapi_tidak_mundur(): void
    {
        $proyek = $this->proyek('Proses Pengerjaan');

        $this->ubahStatus($proyek, 'Selesai')->assertOk();
        $this->ubahStatus($proyek->fresh(), 'Maintenance')->assertOk();
        $this->assertSame('Maintenance', $proyek->fresh()->status_proyek);

        $this->ubahStatus($proyek->fresh(), 'negosiasi')->assertStatus(422);
        $this->ubahStatus($proyek->fresh(), 'pengajuan')->assertStatus(422);
        $this->assertSame('Maintenance', $proyek->fresh()->status_proyek);
    }

    public function test_simpan_data_lain_tanpa_mengubah_status_tetap_boleh(): void
    {
        $proyek = $this->proyek('negosiasi');
        $this->ubahStatus($proyek, 'negosiasi')->assertOk();
    }
}
