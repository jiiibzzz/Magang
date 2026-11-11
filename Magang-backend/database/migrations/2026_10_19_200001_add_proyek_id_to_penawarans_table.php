<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('penawarans', function (Blueprint $table) {
            $table->foreignId('proyek_id')->nullable()->after('customer_id')
                ->constrained('proyeks')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('penawarans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('proyek_id');
        });
    }
};
