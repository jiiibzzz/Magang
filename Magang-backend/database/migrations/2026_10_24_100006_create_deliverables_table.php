<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deliverables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rancangan_proyek_id')->constrained('rancangan_proyeks')->cascadeOnDelete();
            $table->string('nama_deliverable', 150);
            $table->text('deskripsi')->nullable();
            $table->date('target_tanggal')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deliverables');
    }
};
