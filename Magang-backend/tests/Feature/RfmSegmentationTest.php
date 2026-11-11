<?php

namespace Tests\Feature;

use App\Models\Proyek;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RfmSegmentationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed');
    }

    public function test_all_11_segments_are_returned_in_summary_even_when_empty()
    {
        $marketing = User::where('email', 'marketing@kurva.test')->first();

        $res = $this->actingAs($marketing, 'sanctum')->getJson('/api/admin/rfm');
        $res->assertStatus(200);

        $expectedSegments = [
            'Champions',
            'Loyal Customers',
            'Promising',
            'New',
            'Abandoned Checkouts',
            'Warm Leads Cold Leads',
            'Need Attention',
            'based on past purchases',
            "Shouldn't Lose",
            'Sleepers',
            'Lost',
        ];

        $summarySegments = collect($res->json('segments_summary'))->pluck('segment')->toArray();
        $this->assertEquals($expectedSegments, $summarySegments);
    }

    public function test_customers_are_mapped_to_valid_segments_without_others()
    {
        $marketing = User::where('email', 'marketing@kurva.test')->first();
        $customerA = User::role('customer')->first();

        // Buat transaksi untuk customer A
        Proyek::create([
            'customer_id' => $customerA->id,
            'nama_proyek' => 'ERP System Enterprise',
            'deskripsi_kebutuhan' => 'ERP.',
            'status_proyek' => 'Selesai',
            'harga_kontrak' => 150000000,
            'tanggal_selesai' => date('Y-m-d'),
            'progress' => 100,
        ]);

        $res = $this->actingAs($marketing, 'sanctum')->getJson('/api/admin/rfm');
        $res->assertStatus(200);

        $expectedSegments = [
            'Champions',
            'Loyal Customers',
            'Promising',
            'New',
            'Abandoned Checkouts',
            'Warm Leads Cold Leads',
            'Need Attention',
            'based on past purchases',
            "Shouldn't Lose",
            'Sleepers',
            'Lost',
        ];

        $customers = $res->json('customers');
        $this->assertNotEmpty($customers);
        foreach ($customers as $c) {
            $this->assertContains($c['segment'], $expectedSegments);
            $this->assertNotEquals('Others', $c['segment']);
        }
    }
}
