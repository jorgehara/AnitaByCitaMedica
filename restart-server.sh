#!/bin/bash

interval=1800  # 15 minutos en segundos
restart_count=0
log_file="restart-server.log"

while true; do
    restart_count=$((restart_count+1))
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] Reinicio #$restart_count" >> "$log_file"
    echo "Matando procesos en el puerto 3008..."
    fuser -k 3008/tcp 2>/dev/null
    echo "Iniciando el servidor... (Reinicio #$restart_count)"
    npm run dev &
    server_pid=$!

    for ((i=0; i<$interval; i++)); do
        sleep 1
    if grep -q "SOBRETURNO TIMEOUT" restart-server.log || \
       grep -q "\\[SOBRETURNO SERVICE\\] Sistema en modo offline:" restart-server.log || \
       grep -q "\\[nodemon\\] app crashed" restart-server.log || \
       grep -q "Timed Out" restart-server.log || \
       grep -q "Missed call" restart-server.log || \
       grep -q "<Buffer" restart-server.log || \
       grep -iq "crash" restart-server.log || \
       grep -iq "crashed" restart-server.log || \
       grep -q "Failed to decrypt message with any known session" restart-server.log || \
       grep -q "Bad MAC" restart-server.log; then
        echo "SOBRETURNO TIMEOUT, modo offline, app crashed, Timed Out, llamada perdida, error de clave, Bad MAC o crash detectado. Reiniciando inmediatamente..." >> "$log_file"
        kill $server_pid 2>/dev/null
        break
        fi
    done

    kill $server_pid 2>/dev/null
    echo "Servidor detenido o reiniciado."
done
