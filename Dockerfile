FROM ubuntu:18.04

RUN apt update && apt install build-essential -y --no-install-recommends
COPY ./img /img
RUN sh /img/protoc-base.sh
RUN sh /img/protoc-flynn.sh
RUN sh /img/yarn.sh

ARG CONTROLLER_HOST=""
ARG OAUTH_ISSUER=""
ARG OAUTH_CLIENT_ID=""

ENV CONTROLLER_HOST ${CONTROLLER_HOST}
ENV OAUTH_ISSUER ${OAUTH_ISSUER}
ENV OAUTH_CLIENT_ID ${OAUTH_CLIENT_ID}

COPY ./.eslintignore /app/
COPY ./grommet.d.ts /app/
COPY ./*.json /app/
COPY ./yarn.lock /app/
COPY ./config /app/config
COPY ./scripts /app/scripts
COPY ./public /app/public
COPY ./src /app/src

RUN cp /flynn-controller-api/generated/* /app/src/generated/

WORKDIR /app
RUN yarn && yarn build
