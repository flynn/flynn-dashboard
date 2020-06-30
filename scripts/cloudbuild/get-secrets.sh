#!/bin/bash

set -e

gcloud secrets versions access latest --secret=aws-s3deploy > aws_env
