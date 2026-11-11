<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proyeks', function (Blueprint $table) {
            $table->decimal('harga_kontrak', 15, 2)->nullable()->after('deskripsi_kebutuhan');
            $table->decimal('harga_tawaran', 15, 2)->nullable()->after('harga_kontrak');
            $table->text('alasan_tawaran')->nullable()->after('harga_tawaran');
        });
    }

    public function down(): void
    {
        Schema::table('proyeks', function (Blueprint $table) {
            $table->dropColumn(['harga_kontrak', 'harga_tawaran', 'alasan_tawaran']);
        });
    }
};
