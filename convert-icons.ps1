# Скрипт для конвертации SVG иконок в PNG
# Требуется установленный ImageMagick

Write-Host "Конвертация SVG иконок в PNG..." -ForegroundColor Green

# Проверяем наличие ImageMagick
try {
    $magickVersion = magick --version 2>$null
    if ($magickVersion) {
        Write-Host "ImageMagick найден: $magickVersion" -ForegroundColor Green
    } else {
        throw "ImageMagick не найден"
    }
} catch {
    Write-Host "ImageMagick не установлен. Устанавливаем..." -ForegroundColor Yellow
    
    # Попытка установки через Chocolatey
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "Устанавливаем ImageMagick через Chocolatey..." -ForegroundColor Yellow
        choco install imagemagick -y
    } else {
        Write-Host "Chocolatey не найден. Пожалуйста, установите ImageMagick вручную:" -ForegroundColor Red
        Write-Host "https://imagemagick.org/script/download.php#windows" -ForegroundColor Yellow
        exit 1
    }
}

# Создаем папку для PNG иконок
$pngFolder = "icons-png"
if (!(Test-Path $pngFolder)) {
    New-Item -ItemType Directory -Path $pngFolder | Out-Null
    Write-Host "Создана папка: $pngFolder" -ForegroundColor Green
}

# Конвертируем иконки
$sizes = @(96, 192, 512)

foreach ($size in $sizes) {
    $svgFile = "icons/icon-${size}x${size}.svg"
    $pngFile = "$pngFolder/icon-${size}x${size}.png"
    
    if (Test-Path $svgFile) {
        Write-Host "Конвертируем $svgFile в $pngFile..." -ForegroundColor Cyan
        
        try {
            magick convert $svgFile -resize ${size}x${size} $pngFile
            if (Test-Path $pngFile) {
                Write-Host "✓ Успешно создан: $pngFile" -ForegroundColor Green
            } else {
                Write-Host "✗ Ошибка при создании: $pngFile" -ForegroundColor Red
            }
        } catch {
            Write-Host "✗ Ошибка конвертации: $svgFile" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Файл не найден: $svgFile" -ForegroundColor Red
    }
}

# Создаем дополнительные размеры для лучшей поддержки
$additionalSizes = @(16, 32, 48, 72, 144, 180, 228, 384)

foreach ($size in $additionalSizes) {
    $sourceSvg = "icons/icon-512x512.svg"
    $pngFile = "$pngFolder/icon-${size}x${size}.png"
    
    Write-Host "Создаем иконку ${size}x${size}..." -ForegroundColor Cyan
    
    try {
        magick convert $sourceSvg -resize ${size}x${size} $pngFile
        if (Test-Path $pngFile) {
            Write-Host "✓ Успешно создан: $pngFile" -ForegroundColor Green
        } else {
            Write-Host "✗ Ошибка при создании: $pngFile" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Ошибка конвертации: ${size}x${size}" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

# Создаем favicon.ico (16x16, 32x32, 48x48)
Write-Host "Создаем favicon.ico..." -ForegroundColor Cyan
try {
    magick convert icons/icon-512x512.svg -resize 16x16 $pngFolder/favicon-16x16.png
    magick convert icons/icon-512x512.svg -resize 32x32 $pngFolder/favicon-32x32.png
    magick convert icons/icon-512x512.svg -resize 48x48 $pngFolder/favicon-48x48.png
    
    # Создаем ICO файл
    magick convert $pngFolder/favicon-16x16.png $pngFolder/favicon-32x32.png $pngFolder/favicon-48x48.png $pngFolder/favicon.ico
    
    if (Test-Path "$pngFolder/favicon.ico") {
        Write-Host "✓ Успешно создан: favicon.ico" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Ошибка при создании favicon.ico" -ForegroundColor Red
}

Write-Host "`nКонвертация завершена!" -ForegroundColor Green
Write-Host "PNG иконки сохранены в папке: $pngFolder" -ForegroundColor Cyan
Write-Host "Теперь можно обновить manifest.json для использования PNG иконок" -ForegroundColor Yellow
