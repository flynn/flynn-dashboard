FROM ubuntu:18.04

ARG CONTROLLER_HOST=""
ARG OAUTH_ISSUER=""
ARG OAUTH_CLIENT_ID=""

ENV CONTROLLER_HOST ${CONTROLLER_HOST}
ENV OAUTH_ISSUER ${OAUTH_ISSUER}
ENV OAUTH_CLIENT_ID ${OAUTH_CLIENT_ID}

RUN apt update && apt install build-essential -y --no-install-recommends
COPY ./img /img
RUN sh /img/protoc-base.sh
RUN sh /img/protoc-flynn.sh
RUN sh /img/yarn.sh

COPY . /app

WORKDIR /flynn-controller-api/generated
RUN tar -czvf /generated.tar.gz ./*
RUN cp ./* /app/src/generated/

WORKDIR /app
RUN yarn && yarn build
