#!/bin/sh

set -e

# Example Environment Variables (replace with your own)
# GATEWAY_SHARD_START = 0
# GATEWAY_SHARD_END = 5
# GATEWAY_SHARD_COUNT = 18
# GATEWAY_SHARD_COUNT_PER_REPLICA = 6

if [[ -f "/tmp/shard_id_start" ]] && [[ -f "/tmp/shard_id_end" ]] && [[ -f "/tmp/replica_id" ]]; then
    GATEWAY_SHARD_START=$(cat /tmp/shard_id_start)
    GATEWAY_SHARD_END=$(cat /tmp/shard_id_end)
    REPLICA_ID=$(cat /tmp/replica_id)

    ((MAX_REPLICA = ${REPLICA_COUNT:-1} - 1))
    if [[ $REPLICA_ID -gt $MAX_REPLICA ]]; then
        echo "[ENTRYPOINT] ERROR: Max replica ID exceeded (${REPLICA_ID})."
        exit 1
    else
        expr ${GATEWAY_SHARD_START} + ${GATEWAY_SHARD_END} + 1 > /tmp/shard_id_start # 0 + 5 + 1 = 6 (Example calculation)
        GATEWAY_SHARD_START=$(cat /tmp/shard_id_start)
        expr ${GATEWAY_SHARD_END} + ${GATEWAY_SHARD_COUNT_PER_REPLICA} > /tmp/shard_id_end # 5 + 6 = 11 (Example calculation)
        GATEWAY_SHARD_END=$(cat /tmp/shard_id_end)
        expr ${REPLICA_ID} + 1 > /tmp/replica_id # 0 + 1 = 1 (Example calculation)
    fi
else
    echo ${GATEWAY_SHARD_START:=0} > /tmp/shard_id_start
    GATEWAY_SHARD_START=$(cat /tmp/shard_id_start)
    expr ${GATEWAY_SHARD_END:-$GATEWAY_SHARD_COUNT_PER_REPLICA} - 1 > /tmp/shard_id_end
    GATEWAY_SHARD_END=$(cat /tmp/shard_id_end)
    echo ${REPLICA_ID:=0} > /tmp/replica_id
    REPLICA_ID=$(cat /tmp/replica_id)
    echo "[ENTRYPOINT] INFO: Set initial shard ID to: $GATEWAY_SHARD_START & Set end shard ID to: $GATEWAY_SHARD_END, REPLICA ID $REPLICA_ID"
fi

function cleanup() {
    rm -f /tmp/shard_id_start
    rm -f /tmp/shard_id_end
    rm -f /tmp/replica_id
    echo "[ENTRYPOINT] INFO: Shutting down..."
    kill -TERM "$child"
    wait "$child"
}

trap "cleanup" SIGKILL SIGTERM SIGHUP SIGINT

echo "[ENTRYPOINT] Sleeping for 3s" && sleep 3

node -r dotenv/config dist/index.js
child=$!
wait "$child"
