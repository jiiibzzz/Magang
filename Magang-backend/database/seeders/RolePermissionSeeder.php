<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['name' => 'users.view', 'modul' => 'kelola_user', 'panel' => 'admin'],
            ['name' => 'users.create', 'modul' => 'kelola_user', 'panel' => 'admin'],
            ['name' => 'users.edit', 'modul' => 'kelola_user', 'panel' => 'admin'],
            ['name' => 'users.delete', 'modul' => 'kelola_user', 'panel' => 'admin'],
            ['name' => 'roles.view', 'modul' => 'kelola_role', 'panel' => 'admin'],
            ['name' => 'roles.create', 'modul' => 'kelola_role', 'panel' => 'admin'],
            ['name' => 'roles.edit', 'modul' => 'kelola_role', 'panel' => 'admin'],
            ['name' => 'roles.delete', 'modul' => 'kelola_role', 'panel' => 'admin'],
            ['name' => 'permissions.view', 'modul' => 'kelola_permission', 'panel' => 'admin'],
            ['name' => 'permissions.create', 'modul' => 'kelola_permission', 'panel' => 'admin'],
            ['name' => 'permissions.edit', 'modul' => 'kelola_permission', 'panel' => 'admin'],
            ['name' => 'permissions.delete', 'modul' => 'kelola_permission', 'panel' => 'admin'],

            ['name' => 'kelola_artikel', 'modul' => 'kelola_artikel', 'panel' => 'admin'],
            ['name' => 'kelola_testimoni', 'modul' => 'kelola_testimoni', 'panel' => 'admin'],
            ['name' => 'kelola_anggota_tim', 'modul' => 'kelola_anggota_tim', 'panel' => 'admin'],
            ['name' => 'kelola_faq', 'modul' => 'kelola_faq', 'panel' => 'admin'],
            ['name' => 'kelola_pesan_kontak', 'modul' => 'kelola_pesan_kontak', 'panel' => 'admin'],
            ['name' => 'kelola_newsletter', 'modul' => 'kelola_newsletter', 'panel' => 'admin'],
            ['name' => 'kelola_pengaturan', 'modul' => 'kelola_pengaturan', 'panel' => 'admin'],
            ['name' => 'kelola_layanan', 'modul' => 'kelola_layanan', 'panel' => 'admin'],
            ['name' => 'kelola_produk', 'modul' => 'kelola_produk', 'panel' => 'admin'],
            ['name' => 'kelola_chat', 'modul' => 'kelola_chat', 'panel' => 'admin'],
            ['name' => 'kelola_penawaran', 'modul' => 'kelola_penawaran', 'panel' => 'admin'],
            ['name' => 'kelola_proyek', 'modul' => 'kelola_proyek', 'panel' => 'admin'],
            ['name' => 'kelola_negosiasi', 'modul' => 'kelola_negosiasi', 'panel' => 'admin'],
        ];

        foreach ($permissions as $perm) {
            Permission::findOrCreate($perm['name'], 'web');
            $p = Permission::where('name', $perm['name'])->first();
            if ($p) {
                $p->update([
                    'modul' => $perm['modul'],
                    'panel' => $perm['panel'],
                ]);
            }
        }

        $adminRole = Role::findOrCreate('admin', 'web');
        $marketingRole = Role::findOrCreate('marketing', 'web');
        $customerRole = Role::findOrCreate('customer', 'web');

        // Admin mendapatkan semua permission KECUALI kelola_chat, kelola_penawaran, kelola_proyek, dan kelola_negosiasi
        $adminPermissions = Permission::whereNotIn('name', ['kelola_chat', 'kelola_penawaran', 'kelola_proyek', 'kelola_negosiasi'])->get();
        $adminRole->syncPermissions($adminPermissions);

        $marketingRole->syncPermissions(Permission::whereIn('name', [
            'users.view', 'roles.view', 'permissions.view',
            'kelola_artikel', 'kelola_testimoni', 'kelola_anggota_tim', 'kelola_faq', 'kelola_layanan', 'kelola_produk', 'kelola_chat',
            'kelola_penawaran', 'kelola_proyek', 'kelola_pesan_kontak', 'kelola_negosiasi'
        ])->get());
    }
}
