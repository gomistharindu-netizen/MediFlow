#!/bin/sh
set -e

# Ensure database directory exists
mkdir -p /app/database

# Create central sqlite db if missing
if [ ! -f /app/database/database.sqlite ]; then
    touch /app/database/database.sqlite
    php artisan migrate --force
    php artisan db:seed --class=CentralTenantSeeder --force || true
fi

# Set permissions
chmod -R 777 /app/storage /app/bootstrap/cache /app/database

# Start Reverb in background
php artisan reverb:start --host=0.0.0.0 --port=8080 &

# Start Laravel HTTP server on Render's dynamic PORT
echo "Starting Laravel server on port ${PORT:-8000}..."
exec php artisan serve --host=0.0.0.0 --port=${PORT:-8000}
