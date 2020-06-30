FROM node:lts

RUN apt-get update && apt-get install build-essential -y --no-install-recommends
COPY ./scripts /scripts
RUN /scripts/install-protoc.sh && /scripts/protoc-flynn.sh

ARG OAUTH_ISSUER
ARG OAUTH_CLIENT_ID

ENV OAUTH_ISSUER ${OAUTH_ISSUER}
ENV OAUTH_CLIENT_ID ${OAUTH_CLIENT_ID}
ENV COMMIT_SHA "dev"
ENV BUILD_ID "dev"

COPY . /app/

RUN cp /flynn-controller-api/generated/* /app/src/generated/ &&\
    cd /app && yarn && yarn build
