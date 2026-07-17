#!/bin/bash
bun run build
export CHECQUERY_HOST=10.168.168.21
export CHECQUERY_LOG_FILE=/home/mnordberg/code/checquery/data/checquery-log.yaml
bun run start
