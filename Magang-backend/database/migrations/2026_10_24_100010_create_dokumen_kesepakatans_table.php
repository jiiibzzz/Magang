<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dokumen_kesepakatans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kesepakatan_id')->constrained('kesepakatans')->cascadeOnDelete();
            $table->string('jenis', 20);  // kontrak | project_charter
            $table->string('format', 10); // docx | pdf
            $table->string('path_file')->nullable();
            $table->timestamps();

            $table->unique(['kesepakatan_id', 'jenis', 'format']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dokumen_kesepakatans');
    }
};
