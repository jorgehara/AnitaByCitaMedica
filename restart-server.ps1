param(
    [int]$interval = 60
)

$restartCount = 0
$logFile = "restart-server.log"

while ($true) {
    $restartCount++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] Reinicio #$restartCount"
    Add-Content -Path $logFile -Value $logEntry
    Write-Host "Iniciando el servidor... (Reinicio #$restartCount)"
    npm run dev
    Write-Host "Servidor detenido. Esperando $interval segundos para reiniciar..."
    Start-Sleep -Seconds $interval
}
