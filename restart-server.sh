#!/bin/bash

interval=60
restart_count=0
log_file="restart-server.log"

while true; do
    restart_count=$((restart_count+1))
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] Reinicio #$restart_count" >> "$log_file"
    echo "Iniciando el servidor... (Reinicio #$restart_count)"
    npm run dev
    echo "Servidor detenido. Esperando $interval segundos para reiniciar..."
    sleep $interval
done
