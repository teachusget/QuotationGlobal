<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class BlockedMigrateRefreshCommand extends Command
{
    protected $signature = 'migrate:refresh';

    protected $description = 'Disabled to protect existing database data';

    public function handle(): int
    {
        $this->components->error(
            'migrate:refresh is disabled because it can destroy existing database data.'
        );

        $this->line('Create a new migration and run php artisan migrate instead.');

        return self::FAILURE;
    }
}
