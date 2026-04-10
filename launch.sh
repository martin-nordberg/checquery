#!/bin/bash
bun run build
CHECQUERY_HOST=10.0.0.61 CHECQUERY_LOG_FILE=/home/mnordberg/code/checquery/data/checquery-log.yaml bun run start