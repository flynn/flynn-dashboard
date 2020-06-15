flynn dashboard
===============

## Building

```
$ docker build . --build-arg CONTROLLER_HOST="" --build-arg OAUTH_ISSUER="" --build-arg OAUTH_CLIENT_ID=""
```

## Development

### Generate protobuf files

TODO (files are generated as part of docker image, but not extracted)

### Run dev server

```
# on your local machine
(github.com/flynn/flynn-dashboard) $ yarn
$ OAUTH_ISSUER=https://oauth.flynnhub.com CONTROLLER_HOST="" OAUTH_CLIENT_ID="" yarn start
```

