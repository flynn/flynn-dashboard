build:
	docker build --tag "flynn:dashboard" .

generate: build
	./scripts/extract-generated.sh

clean:
	rm -rf build

test:
	yarn test

.PHONY: build generate clean test
