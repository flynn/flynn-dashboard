FROM ubuntu:18.04
RUN apt update && apt install build-essential -y --no-install-recommends
COPY ./img /img
RUN sh /img/protoc-base.sh
RUN sh /img/protoc-flynn.sh
RUN sh /img/yarn.sh
COPY . /app
RUN cp /flynn-controller-api/generated/* /app/src/generated/
WORKDIR /app
RUN make
