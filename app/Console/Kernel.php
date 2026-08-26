<?php

namespace App\Console;

use App\Console\Commands\BlockedMigrateRefreshCommand;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Application commands registered after framework commands, allowing this
     * safety command to replace Laravel's destructive migrate:refresh command.
     */
    protected $commands = [
        BlockedMigrateRefreshCommand::class,
    ];

    protected function schedule(Schedule $schedule) {}

    protected function commands()
    {
        $this->load(__DIR__.'/Commands');
        require base_path('routes/console.php');
    }
}
