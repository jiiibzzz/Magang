<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatSession;
use App\Models\ChatMessage;
use App\Models\ChatFile;
use App\Models\PesanKontak;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ChatController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isCustomer = $user->roles->contains('name', 'customer');

        $query = ChatSession::with(['customer', 'marketing', 'product', 'layanan']);

        if ($isCustomer) {
            $query->where('customer_id', $user->id);
        }

        return response()->json($query->latest('updated_at')->get());
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $isCustomer = $user->roles->contains('name', 'customer');

        // Tandai semua pesan dari pengirim lain di sesi ini sebagai dibaca
        ChatMessage::where('chat_session_id', $id)
            ->where('sender_id', '!=', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $session = ChatSession::with([
            'customer', 
            'marketing', 
            'product', 
            'layanan',
            'messages.sender', 
            'files.uploader'
        ])->findOrFail($id);

        if ($isCustomer && $session->customer_id !== $user->id) {
            return response()->json(['message' => 'Anda tidak memiliki akses ke obrolan ini.'], 403);
        }

        return response()->json($session);
    }

    public function startSession(Request $request)
    {
        $user = $request->user();
        $request->validate([
            'product_id' => 'nullable|exists:produks,id_produk',
            'layanan_id' => 'nullable|exists:layanan,id_layanan',
            'marketing_id' => 'nullable|exists:users,id',
        ]);

        // Cari apakah ada sesi aktif (bukan Arsip) untuk produk/layanan/marketing yang sama
        $query = ChatSession::where('customer_id', $user->id)
            ->where('status', '!=', 'Arsip');
        
        if ($request->product_id) {
            $query->where('product_id', $request->product_id);
        }
        if ($request->layanan_id) {
            $query->where('layanan_id', $request->layanan_id);
        }
        if ($request->marketing_id) {
            $query->where('marketing_id', $request->marketing_id);
        }

        $existing = $query->first();

        if ($existing) {
            return response()->json($existing, 200);
        }

        $session = ChatSession::create([
            'customer_id' => $user->id,
            'product_id' => $request->product_id,
            'layanan_id' => $request->layanan_id,
            'marketing_id' => $request->marketing_id,
            'status' => $request->marketing_id ? 'Ditindaklanjuti' : 'Ketertarikan',
        ]);

        if ($request->marketing_id) {
            $marketing = \App\Models\User::find($request->marketing_id);
            ChatMessage::create([
                'chat_session_id' => $session->id,
                'sender_id' => $user->id, // Kirim sebagai system/user
                'message' => '[Sistem] Obrolan ini langsung diarahkan ke ' . $marketing->name . ' yang sedang online.',
            ]);
        }

        return response()->json($session->load(['layanan', 'product']), 201);
    }

    public function sendMessage(Request $request, $id)
    {
        $user = $request->user();
        $isCustomer = $user->roles->contains('name', 'customer');

        $session = ChatSession::findOrFail($id);

        if ($isCustomer && $session->customer_id !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $request->validate([
            'message' => 'required|string',
        ]);

        $message = ChatMessage::create([
            'chat_session_id' => $session->id,
            'sender_id' => $user->id,
            'message' => $request->message,
        ]);

        // Update updated_at of session to sort latest chats
        $session->touch();

        return response()->json($message->load('sender'), 201);
    }

    public function uploadFile(Request $request, $id)
    {
        $user = $request->user();
        $isCustomer = $user->roles->contains('name', 'customer');

        $session = ChatSession::findOrFail($id);

        if ($isCustomer && $session->customer_id !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $request->validate([
            'file' => 'required|file|max:10240', // 10MB limit
            'keterangan' => 'required|string|max:255',
        ]);

        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();
        $filePath = $file->store('chat_files', 'public');

        $chatFile = ChatFile::create([
            'chat_session_id' => $session->id,
            'uploader_id' => $user->id,
            'file_path' => $filePath,
            'file_name' => $fileName,
            'keterangan' => $request->keterangan,
        ]);

        // Kirim pesan sistem agar terupdate di UI Chat
        ChatMessage::create([
            'chat_session_id' => $session->id,
            'sender_id' => $user->id,
            'message' => '[Sistem] Mengunggah dokumen: "' . $fileName . '" dengan keterangan: "' . $request->keterangan . '"',
        ]);

        $session->touch();

        return response()->json($chatFile->load('uploader'), 201);
    }

    public function claimChat(Request $request, $id)
    {
        $user = $request->user();
        $isCustomer = $user->roles->contains('name', 'customer');

        if ($isCustomer) {
            return response()->json(['message' => 'Klien tidak dapat mengklaim obrolan.'], 403);
        }

        $session = ChatSession::findOrFail($id);
        $session->update([
            'marketing_id' => $user->id,
            'status' => 'Ditindaklanjuti', // Otomatis ke Ditindaklanjuti saat diklaim
        ]);

        ChatMessage::create([
            'chat_session_id' => $session->id,
            'sender_id' => $user->id,
            'message' => '[Sistem] Obrolan ini telah diklaim oleh ' . $user->name . ' dari tim Marketing.',
        ]);

        $session->touch();

        return response()->json($session->load(['customer', 'marketing', 'product']));
    }

    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();
        $isCustomer = $user->roles->contains('name', 'customer');

        if ($isCustomer) {
            return response()->json(['message' => 'Klien tidak dapat mengubah status tahapan proyek.'], 403);
        }

        $session = ChatSession::findOrFail($id);

        $request->validate([
            'status' => 'required|in:Ketertarikan,Ditindaklanjuti,Penawaran,Negosiasi,Deal,Arsip',
        ]);

        $oldStatus = $session->status;
        $session->update([
            'status' => $request->status,
        ]);

        ChatMessage::create([
            'chat_session_id' => $session->id,
            'sender_id' => $user->id,
            'message' => '[Sistem] Tahapan lead diubah dari "' . $oldStatus . '" menjadi "' . $request->status . '".',
        ]);

        $session->touch();

        return response()->json($session->load(['customer', 'marketing', 'product']));
    }

    public function updateMessage(Request $request, $id, $messageId)
    {
        $user = $request->user();
        $session = ChatSession::findOrFail($id);

        $isCustomer = $user->roles->contains('name', 'customer');
        if ($isCustomer && $session->customer_id !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $message = ChatMessage::where('chat_session_id', $session->id)
            ->findOrFail($messageId);

        // Hanya pengirim pesan yang boleh mengedit
        if ($message->sender_id !== $user->id) {
            return response()->json(['message' => 'Anda hanya dapat mengedit pesan Anda sendiri.'], 403);
        }

        // Pesan sistem tidak dapat diedit
        if (str_starts_with($message->message, '[Sistem]')) {
            return response()->json(['message' => 'Pesan sistem tidak dapat diedit.'], 400);
        }

        $request->validate([
            'message' => 'required|string',
        ]);

        $message->update([
            'message' => $request->message,
            'is_edited' => true,
        ]);

        return response()->json($message->load('sender'));
    }

    public function deleteMessage(Request $request, $id, $messageId)
    {
        $user = $request->user();
        $session = ChatSession::findOrFail($id);

        $isCustomer = $user->roles->contains('name', 'customer');
        if ($isCustomer && $session->customer_id !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $message = ChatMessage::where('chat_session_id', $session->id)
            ->findOrFail($messageId);

        // Pesan sistem tidak dapat dihapus
        if (str_starts_with($message->message, '[Sistem]')) {
            return response()->json(['message' => 'Pesan sistem tidak dapat dihapus.'], 400);
        }

        $message->delete();

        return response()->json(['message' => 'Pesan berhasil dihapus.']);
    }

    public function updateFile(Request $request, $id, $fileId)
    {
        $user = $request->user();
        $session = ChatSession::findOrFail($id);

        $isCustomer = $user->roles->contains('name', 'customer');
        if ($isCustomer && $session->customer_id !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $chatFile = ChatFile::where('chat_session_id', $session->id)->findOrFail($fileId);

        // Hanya pengunggah file yang boleh mengedit
        if ($chatFile->uploader_id !== $user->id) {
            return response()->json(['message' => 'Anda hanya dapat mengedit dokumen yang Anda unggah sendiri.'], 403);
        }

        $request->validate([
            'keterangan' => 'required|string|max:255',
            'file' => 'nullable|file|max:10240',
        ]);

        $fileName = $chatFile->file_name;
        $filePath = $chatFile->file_path;

        if ($request->hasFile('file')) {
            // Hapus file lama
            if (Storage::disk('public')->exists($chatFile->file_path)) {
                Storage::disk('public')->delete($chatFile->file_path);
            }
            $file = $request->file('file');
            $fileName = $file->getClientOriginalName();
            $filePath = $file->store('chat_files', 'public');
        }

        $chatFile->update([
            'file_name' => $fileName,
            'file_path' => $filePath,
            'keterangan' => $request->keterangan,
        ]);

        // Kirim pesan sistem agar terupdate di UI Chat
        ChatMessage::create([
            'chat_session_id' => $session->id,
            'sender_id' => $user->id,
            'message' => '[Sistem] Memperbarui dokumen: "' . $fileName . '" dengan keterangan: "' . $request->keterangan . '"',
        ]);

        $session->touch();

        return response()->json($chatFile->load('uploader'));
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $session = ChatSession::with(['files'])->findOrFail($id);

        $isCustomer = $user->roles->contains('name', 'customer');
        if ($isCustomer && $session->customer_id !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        // Hapus semua berkas fisik terkait dokumen di chat session ini
        foreach ($session->files as $file) {
            if ($file->file_path && Storage::disk('public')->exists($file->file_path)) {
                Storage::disk('public')->delete($file->file_path);
            }
        }

        $session->delete();

        return response()->json(['message' => 'Topik obrolan berhasil dihapus.']);
    }

    public function deleteFile(Request $request, $id, $fileId)
    {
        $user = $request->user();
        $session = ChatSession::findOrFail($id);

        $isCustomer = $user->roles->contains('name', 'customer');
        if ($isCustomer && $session->customer_id !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $chatFile = ChatFile::where('chat_session_id', $session->id)->findOrFail($fileId);

        // Hanya pengunggah file yang boleh menghapus
        if ($chatFile->uploader_id !== $user->id) {
            return response()->json(['message' => 'Anda hanya dapat menghapus dokumen yang Anda unggah sendiri.'], 403);
        }

        // Hapus file fisik
        if (Storage::disk('public')->exists($chatFile->file_path)) {
            Storage::disk('public')->delete($chatFile->file_path);
        }

        $fileName = $chatFile->file_name;
        $chatFile->delete();

        // Kirim pesan sistem agar terupdate di UI Chat
        ChatMessage::create([
            'chat_session_id' => $session->id,
            'sender_id' => $user->id,
            'message' => '[Sistem] Menghapus dokumen: "' . $fileName . '"',
        ]);

        $session->touch();

        return response()->json(['message' => 'Dokumen berhasil dihapus.']);
    }

    /**
     * Follow-up from a contact form message — Marketing starts/finds a chat session
     * with the customer who sent the contact form, claims it, and sends a follow-up message.
     */
    public function followupFromForm(Request $request)
    {
        $user = $request->user();
        $isCustomer = $user->roles->contains('name', 'customer');

        if ($isCustomer) {
            return response()->json(['message' => 'Klien tidak dapat melakukan tindakan ini.'], 403);
        }

        $request->validate([
            'id_pesan_kontak' => 'required|exists:pesan_kontak,id_pesan_kontak',
            'pesan_awal'      => 'nullable|string|max:2000',
        ]);

        $pesanKontak = PesanKontak::findOrFail($request->id_pesan_kontak);

        // Hanya customer (user yang login) yang bisa di-follow-up via chat
        $customerId = $pesanKontak->id_user;

        if (!$customerId) {
            return response()->json([
                'message' => 'Pesan ini dikirim oleh pengunjung tanpa akun. Tidak dapat membuka sesi chat.'
            ], 422);
        }

        // Cari sesi aktif yang sudah ada untuk customer ini (tanpa filter produk)
        $session = ChatSession::where('customer_id', $customerId)
            ->where('status', '!=', 'Selesai')
            ->latest('updated_at')
            ->first();

        if (!$session) {
            // Buat sesi baru — topik diambil dari subjek pesan formulir
            $session = ChatSession::create([
                'customer_id' => $customerId,
                'product_id'  => null,
                'status'      => 'Ditindaklanjuti',
                'marketing_id' => $user->id,
            ]);

            // Pesan sistem pembuka
            ChatMessage::create([
                'chat_session_id' => $session->id,
                'sender_id'       => $user->id,
                'message'         => '[Sistem] Sesi obrolan dibuka sebagai tindak lanjut dari Pesan Formulir Kontak: "' . $pesanKontak->subjek . '"',
            ]);
        } else {
            // Jika belum di-claim, klaim otomatis
            if (!$session->marketing_id) {
                $session->update([
                    'marketing_id' => $user->id,
                    'status'       => 'Ditindaklanjuti',
                ]);

                ChatMessage::create([
                    'chat_session_id' => $session->id,
                    'sender_id'       => $user->id,
                    'message'         => '[Sistem] Obrolan diklaim oleh ' . $user->name . ' dari tim Marketing.',
                ]);
            }

            // Pesan sistem follow-up formulir
            ChatMessage::create([
                'chat_session_id' => $session->id,
                'sender_id'       => $user->id,
                'message'         => '[Sistem] Tindak lanjut dari Pesan Formulir Kontak: "' . $pesanKontak->subjek . '"',
            ]);
        }

        // Kirim pesan follow-up pertama dari marketing (jika ada)
        $pesanAwal = $request->pesan_awal ?? 'Halo ' . $pesanKontak->nama . ', terima kasih telah menghubungi kami melalui formulir kontak mengenai "' . $pesanKontak->subjek . '". Tim kami siap membantu Anda, silakan sampaikan lebih lanjut kebutuhan Anda.';

        $message = ChatMessage::create([
            'chat_session_id' => $session->id,
            'sender_id'       => $user->id,
            'message'         => $pesanAwal,
        ]);

        // Update status pesan kontak jadi 'replied'
        $pesanKontak->update(['status' => 'replied']);

        $session->touch();

        return response()->json([
            'session_id' => $session->id,
            'message'    => 'Sesi chat berhasil dibuka dan pesan follow-up telah dikirim.',
        ], 201);
    }
}
