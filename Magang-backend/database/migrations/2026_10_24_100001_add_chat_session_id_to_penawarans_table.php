<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menghubungkan penawaran ke sesi chat (deal di pipeline CRM),
 * supaya sistem negosiasi tahu penawaran ini milik deal yang mana.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('penawarans', function (Blueprint $table) {
            $table->foreignId('chat_session_id')
                ->nullable()
                ->after('customer_id')
                ->constrained('chat_sessions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('penawarans', function (Blueprint $table) {
            $table->dropForeign(['chat_session_id']);
            $table->dropColumn('chat_session_id');
        });
    }
};
