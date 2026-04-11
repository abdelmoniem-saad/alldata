param(
    [switch]$Seed,
    [switch]$Health
)

$ErrorActionPreference = "Stop"

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Test-Command([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -ne $cmd) {
        Write-Host "[ok] $Name found: $($cmd.Source)"
        return $true
    }

    Write-Host "[warn] $Name not found in PATH" -ForegroundColor Yellow
    return $false
}

Write-Section "Tooling"
$hasPython = Test-Command "python"
$hasNpm = Test-Command "npm"
$hasDocker = Test-Command "docker"

$databaseUrl = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "sqlite+aiosqlite:///./alldata.db" }
$redisUrl = if ($env:REDIS_URL) { $env:REDIS_URL } else { "redis://localhost:6379/0" }

if ($hasPython) {
    python --version
}

if ($hasNpm) {
    npm --version
}

if ($hasDocker) {
    docker --version
    docker compose version
}

Write-Section "Ports"
Write-Host "DATABASE_URL: $databaseUrl"
Write-Host "REDIS_URL:    $redisUrl"

if ($databaseUrl.StartsWith("postgresql")) {
    $pg = Test-NetConnection localhost -Port 5432 -WarningAction SilentlyContinue
    Write-Host "Postgres (5432): $($pg.TcpTestSucceeded)"
}
else {
    Write-Host "Postgres check skipped (non-Postgres DATABASE_URL)"
}

$redis = Test-NetConnection localhost -Port 6379 -WarningAction SilentlyContinue
Write-Host "Redis (6379):    $($redis.TcpTestSucceeded)"

if ($Seed) {
    Write-Section "Seed"
    if (-not $hasPython) {
        throw "python is required for seeding"
    }

    python -m seed.import_seed
}

if ($Health) {
    Write-Section "Health"
    try {
        $resp = Invoke-RestMethod "http://127.0.0.1:8000/api/health"
        Write-Host "API health response: $($resp | ConvertTo-Json -Compress)"
    }
    catch {
        Write-Host "[warn] API health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}


