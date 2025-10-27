module.exports = {
  apps: [{
    name: 'anita-bot',
    script: './src/app.ts',
    interpreter: 'node',
    interpreter_args: '--loader ts-node/esm',
    watch: ['src'],
    ignore_watch: ['node_modules', 'logs'],
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3008
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    time: true,
    instances: 1,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 4000,
    kill_timeout: 3000,
    wait_ready: true,
    listen_timeout: 10000,
    exec_mode: 'fork'
  }]
}