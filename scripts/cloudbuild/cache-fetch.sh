#!/bin/bash

gsutil cp gs://$CACHE_BUCKET/flynn-dashboard-build-cache.tar.gz /tmp/cache.tar.gz || exit 0
tar xf /tmp/cache.tar.gz -C /workspace
