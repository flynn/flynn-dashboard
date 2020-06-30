#!/bin/bash

set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

cd ${ROOT}
scripts/cloudbuild/install-s3deploy.sh

source aws_env

s3deploy -bucket $S3_BUCKET -distribution-id $CF_DISTRIBUTION -region $S3_REGION -source build -key $AWS_ACCESS_KEY_ID -secret $AWS_SECRET_ACCESS_KEY
