<?php

namespace Tests\Feature;

use App\Models\ChatSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatClaimTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed');
    }

    public function test_marketing_mengklaim_chat_tanpa_marketing(): void
    {
        $marketing = User::where('email', 'marketing@kurva.test')->first();
        $customer = User::role('customer')->first();

        // Customer memulai konsultasi dari halaman layanan (tanpa marketing)
        $sesiId = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/chats', [])
            ->assertCreated()
            ->json('id');

        $this->assertNull(ChatSession::find($sesiId)->marketing_id);

        // Customer tidak boleh mengklaim
        $this->actingAs($customer, 'sanctum')->postJson("/api/chats/{$sesiId}/claim")->assertForbidden();

        $this->actingAs($marketing, 'sanctum')
            ->postJson("/api/chats/{$sesiId}/claim")
            ->assertOk()
            ->assertJsonPath('marketing.id', $marketing->id);

        $this->assertDatabaseHas('chat_messages', [
            'chat_session_id' => $sesiId,
            'message' => '[Sistem] Obrolan ini telah diklaim oleh ' . $marketing->name . ' dari tim Marketing.',
        ]);

        // Marketing lain tidak bisa merebut chat yang sudah diklaim
        $lain = User::create(['name' => 'Marketing Dua', 'email' => 'marketing2@kurva.test', 'password' => 'password', 'status' => 'aktif']);
        $lain->assignRole('marketing');

        $this->actingAs($lain, 'sanctum')->postJson("/api/chats/{$sesiId}/claim")->assertStatus(409);
        $this->assertSame($marketing->id, ChatSession::find($sesiId)->marketing_id);
    }
}
