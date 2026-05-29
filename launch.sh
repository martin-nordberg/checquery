#!/bin/bash
bun run build
CHECQUERY_HOST=10.168.168.21 CHECQUERY_LOG_FILE=/home/mnordberg/code/checquery/data/checquery-log.yaml bun run start