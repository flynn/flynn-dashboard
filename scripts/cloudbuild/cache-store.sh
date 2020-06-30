#!/bin/bash

tar czf /tmp/cache.tar.gz cache
gsutil cp /tmp/cache.tar.gz gs://$CACHE_BUCKET/flynn-dashboard-build-cache.tar.gz
