# ============================================
# Sunucu Deploy Script
# Kullanim:
#   .\deploy.ps1          -> Sadece web dosyalarini gonder (hizli)
#   .\deploy.ps1 -Full    -> Proje kaynak kodlarini da gonder
# ============================================

param(
    [switch]$Full
)

$SERVER = "baran@192.168.1.104"
$REMOTE_PATH = "/home/baran/sunucu"
$LOCAL_PATH = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "=== Sunucu Deploy ===" -ForegroundColor Cyan
Write-Host "Kaynak: $LOCAL_PATH" -ForegroundColor DarkGray
Write-Host "Hedef:  ${SERVER}:${REMOTE_PATH}" -ForegroundColor DarkGray
Write-Host ""

# --- ADIM 1: Web dosyalarini gonder (her zaman) ---
Write-Host "[1/3] Web dosyalari gonderiliyor..." -ForegroundColor Yellow

$webFiles = @(
    "app.py",
    "requirements.txt"
)

# Tek tek dosyalari gonder
$filePaths = @()
foreach ($f in $webFiles) {
    $fp = Join-Path $LOCAL_PATH $f
    if (Test-Path $fp) { $filePaths += $fp }
}
if ($filePaths.Count -gt 0) {
    scp @filePaths "${SERVER}:${REMOTE_PATH}/"
}

# Klasorleri gonder (bunlar kucuk, venv icermez)
$webDirs = @("templates", "static", "deploy")
foreach ($d in $webDirs) {
    $dp = Join-Path $LOCAL_PATH $d
    if (Test-Path $dp) {
        Write-Host "  -> $d/" -ForegroundColor DarkGray
        scp -r $dp "${SERVER}:${REMOTE_PATH}/"
    }
}

Write-Host "  Web dosyalari gonderildi!" -ForegroundColor Green

# --- ADIM 2: Proje kaynak kodlari (sadece -Full ile) ---
if ($Full) {
    Write-Host ""
    Write-Host "[+] Proje kaynak kodlari gonderiliyor..." -ForegroundColor Yellow

    # docker-hardened-image: sadece Dockerfile ve app klasoru
    $dockerDir = Join-Path $LOCAL_PATH "docker-hardened-image"
    if (Test-Path $dockerDir) {
        Write-Host "  -> docker-hardened-image/" -ForegroundColor DarkGray
        ssh $SERVER "mkdir -p $REMOTE_PATH/docker-hardened-image/app $REMOTE_PATH/docker-hardened-image/images"

        $dockerFiles = Get-ChildItem -Path $dockerDir -File | Where-Object { $_.Name -notmatch '__pycache__' }
        if ($dockerFiles) {
            scp ($dockerFiles | ForEach-Object { $_.FullName }) "${SERVER}:${REMOTE_PATH}/docker-hardened-image/"
        }
        $dockerApp = Join-Path $dockerDir "app"
        if (Test-Path $dockerApp) {
            $appFiles = Get-ChildItem -Path $dockerApp -File
            if ($appFiles) {
                scp ($appFiles | ForEach-Object { $_.FullName }) "${SERVER}:${REMOTE_PATH}/docker-hardened-image/app/"
            }
        }
        $dockerImg = Join-Path $dockerDir "images"
        if (Test-Path $dockerImg) {
            $imgFiles = Get-ChildItem -Path $dockerImg -File
            if ($imgFiles) {
                scp ($imgFiles | ForEach-Object { $_.FullName }) "${SERVER}:${REMOTE_PATH}/docker-hardened-image/images/"
            }
        }
    }

    # wikipedia-speedrun: sadece .py, .json, .txt dosyalari (venv HARIC)
    $wikiDir = Join-Path $LOCAL_PATH "wikipedia-speedrun"
    if (Test-Path $wikiDir) {
        Write-Host "  -> wikipedia-speedrun/ (venv haric)" -ForegroundColor DarkGray
        ssh $SERVER "mkdir -p $REMOTE_PATH/wikipedia-speedrun"

        $wikiFiles = Get-ChildItem -Path $wikiDir -File | Where-Object {
            $_.Extension -in @('.py', '.json', '.txt', '.md', '.cfg', '.toml', '.yml', '.yaml') -or $_.Name -eq 'requirements.txt'
        }
        if ($wikiFiles) {
            scp ($wikiFiles | ForEach-Object { $_.FullName }) "${SERVER}:${REMOTE_PATH}/wikipedia-speedrun/"
        }
    }

    # youtube-download: sadece .py, .txt dosyalari (venv HARIC)
    $ytDir = Join-Path $LOCAL_PATH "youtube-download"
    if (Test-Path $ytDir) {
        Write-Host "  -> youtube-download/ (venv haric)" -ForegroundColor DarkGray
        ssh $SERVER "mkdir -p $REMOTE_PATH/youtube-download"

        $ytFiles = Get-ChildItem -Path $ytDir -File | Where-Object {
            $_.Extension -in @('.py', '.json', '.txt', '.md', '.cfg', '.toml', '.yml', '.yaml') -or $_.Name -eq 'requirements.txt'
        }
        if ($ytFiles) {
            scp ($ytFiles | ForEach-Object { $_.FullName }) "${SERVER}:${REMOTE_PATH}/youtube-download/"
        }
    }

    Write-Host "  Proje dosyalari gonderildi!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  (Proje klasorleri atlanıyor. Gondermek icin: .\deploy.ps1 -Full)" -ForegroundColor DarkGray
}

# --- ADIM 3: Sunucu yeniden baslat (ssh -t ile TTY gerekli sudo icin) ---
Write-Host ""
Write-Host "[2/3] Sunucu yeniden baslatiliyor + Nginx reload..." -ForegroundColor Yellow
Write-Host "  (sudo sifresi istenecek)" -ForegroundColor DarkGray
ssh -t $SERVER "sudo systemctl restart sunucu && sudo nginx -t && sudo systemctl reload nginx && echo '' && echo 'Sunucu + Nginx yeniden baslatildi!'"

Write-Host ""
Write-Host "=== Deploy tamamlandi! ===" -ForegroundColor Green
Write-Host "Site: https://www.baranbasaran.com" -ForegroundColor Cyan
Write-Host ""
