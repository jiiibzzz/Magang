<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FollowUpLog extends Model
{
    protected $table = 'follow_up_logs';

    protected $fillable = ['sesi_negosiasi_id', 'follow_up_ke', 'chat_message_id'];
}
