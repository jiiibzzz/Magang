<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permintaan_perubahans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negosiasi_id')->constrained('negosiasis')->cascadeOnDelete();
            $table->text('deskripsi_perubahan');
            $table->string('status', 20)->default('baru'); // baru | ditindaklanjuti
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permintaan_perubahans');
    }
};
