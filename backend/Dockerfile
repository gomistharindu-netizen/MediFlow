FROM php:8.3-cli-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git \
    unzip \
    libzip-dev \
    sqlite-dev \
    icu-dev \
    oniguruma-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
    pdo_sqlite \
    bcmath \
    mbstring \
    pcntl \
    intl \
    zip \
    gd \
    opcache

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy application files
COPY . .

# Install dependencies (production, skip dev)
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Create storage links and set permissions
RUN chmod -R 777 storage bootstrap/cache database && \
    chmod +x docker-start.sh

ENV PORT=8000
EXPOSE 8000 8080

CMD ["./docker-start.sh"]
