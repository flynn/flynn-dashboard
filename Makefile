build:
	docker build --tag "flynn:dashboard" --build-arg OAUTH_ISSUER="${OAUTH_ISSUER}" --build-arg OAUTH_CLIENT_ID="${OAUTH_CLIENT_ID}" .
	./scripts/extract-build.sh

generate: build
	./scripts/extract-generated.sh

clean:
	rm -rf build

test:
	yarn test

.PHONY: build generate clean test
