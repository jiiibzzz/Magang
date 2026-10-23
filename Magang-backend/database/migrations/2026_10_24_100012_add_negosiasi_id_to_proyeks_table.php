<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Proyek yang lahir dari kesepakatan negosiasi bisa dilacak ke negosiasinya.
 * Nullable karena proyek lama dan proyek yang diajukan langsung oleh customer
 * (fitur "Ajukan Proyek" CRM) tidak melewati negosiasi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proyeks', function (Blueprint $table) {
            $table->foreignId('negosiasi_id')
                ->nullable()
                ->after('chat_session_id')
                ->constrained('negosiasis')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('proyeks', function (Blueprint $table) {
            $table->dropForeign(['negosiasi_id']);
            $table->dropColumn('negosiasi_id');
        });
    }
};
