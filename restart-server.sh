#!/bin/bash

interval=300  # 5 minutos en segundos
restart_count=0
log_file="restart-server.log"

while true; do
    restart_count=$((restart_count+1))
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] Reinicio #$restart_count" >> "$log_file"
    pm2 restart anita-bot
    sleep $interval
done
