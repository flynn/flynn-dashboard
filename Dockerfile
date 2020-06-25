FROM ubuntu:20.04

RUN apt-get update && apt-get install build-essential -y --no-install-recommends
COPY ./img /img
RUN /img/protoc-base.sh && /img/protoc-flynn.sh && /img/yarn.sh

ARG OAUTH_ISSUER
ARG OAUTH_CLIENT_ID

ENV OAUTH_ISSUER ${OAUTH_ISSUER}
ENV OAUTH_CLIENT_ID ${OAUTH_CLIENT_ID}

COPY . /app/

RUN cp /flynn-controller-api/generated/* /app/src/generated/ &&\
    cd /app && yarn && yarn build
