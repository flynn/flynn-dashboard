flynn dashboard
===============

## Building

```
(github.com/flynn/flynn-dashboard) $ OAUTH_ISSUER="" OAUTH_CLIENT_ID="" make
```

## Development

### Generate protobuf files

```
(github.com/flynn/flynn-dashboard) $ make generate
```

### Run dev server

```
(github.com/flynn/flynn-dashboard) $ yarn
$ OAUTH_ISSUER=https://oauth.flynnhub.com OAUTH_CLIENT_ID="" yarn start
```

