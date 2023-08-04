#!/bin/sh
set -e

# Example Environment Variables (replace with your own)
# GATEWAY_SHARD_START = 0
# GATEWAY_SHARD_END = 5
# GATEWAY_SHARD_COUNT = 18
# GATEWAY_SHARD_COUNT_PER_REPLICA = 6


if [[ -f "/tmp/shard_id_start" ]] && [[ -f "/tmp/shard_id_end" ]] && [[ -f "/tmp/replica_id" ]]; then
    TEMP_GATEWAY_SHARD_START=$(cat /tmp/shard_id_start)
    TEMP_GATEWAY_SHARD_END=$(cat /tmp/shard_id_end)
    TEMP_REPLICA_ID=$(cat /tmp/replica_id)

    if [[ $TEMP_REPLICA_ID -gt $REPLICA_COUNT ]]; then
        echo "[ENTRYPOINT] ERROR: Max replica ID exceeded (${REPLICA_ID})."
        exit 1
    else
        SHARD_START=$((TEMP_GATEWAY_SHARD_START + TEMP_GATEWAY_SHARD_END + 1)) # 0 + 5 + 1 = 6 (Example calculation)
        echo "${SHARD_START}" > /tmp/shard_id_start 
        export GATEWAY_SHARD_START=$(cat /tmp/shard_id_start)

        SHARD_END=$((TEMP_GATEWAY_SHARD_END + GATEWAY_SHARD_COUNT_PER_REPLICA)) # 5 + 6 = 11 (Example calculation)
        echo "${SHARD_END}" > /tmp/shard_id_end
        export GATEWAY_SHARD_END=$(cat /tmp/shard_id_end)

        REPLICA=$((TEMP_REPLICA_ID + 1)) # 0 + 1 = 1 (Example calculation)
        echo "${REPLICA}" > /tmp/replica_id
        export REPLICA_ID=$(cat /tmp/replica_id)
    fi
else
    echo ${GATEWAY_SHARD_START:=0} > /tmp/shard_id_start
    export GATEWAY_SHARD_START=$(cat /tmp/shard_id_start)

    SHARD_END=$((GATEWAY_SHARD_COUNT_PER_REPLICA - 1))
    echo "${SHARD_END}" > /tmp/shard_id_end
    export GATEWAY_SHARD_END=$(cat /tmp/shard_id_end)

    echo ${REPLICA_ID:=0} > /tmp/replica_id
    export REPLICA_ID=$(cat /tmp/replica_id)

    echo "[ENTRYPOINT] INFO: Set initial shard ID to: $GATEWAY_SHARD_START & Set end shard ID to: $GATEWAY_SHARD_END, REPLICA ID $REPLICA_ID"
fi

function cleanup() {
    rm -f /tmp/shard_id_start /tmp/shard_id_end /tmp/replica_id
    echo "[ENTRYPOINT] INFO: Shutting down..."
    kill -TERM "$child"
    wait "$child"
}

trap "cleanup" SIGKILL SIGTERM SIGHUP SIGINT

echo "[ENTRYPOINT] Sleeping for 3s" && sleep 3

node -r dotenv/config dist/index.js
child=$!
wait "$child"
