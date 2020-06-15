build:
	yarn && yarn build

clean:
	rm -rf build

test:
	yarn test

.PHONY: build clean test
