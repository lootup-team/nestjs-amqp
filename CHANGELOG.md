# 1.0.0 (2025-06-28)


### Bug Fixes

* `@gedai/nestjs-core` -> `@lootupteam/nestjs-core` ([febf9ee](https://github.com/lootup-team/nestjs-amqp/commit/febf9eee38ca593855e9d12c6446000d68948b6c))
* appends inner exception manually ([cb67481](https://github.com/lootup-team/nestjs-amqp/commit/cb674811bad23281d45bfef79edb50d6d8ae52fe))
* ensures lib works without global config module ([9b47cc1](https://github.com/lootup-team/nestjs-amqp/commit/9b47cc1abe979293917b398e839f10387f999553))
* incorrect documentation example ([01047ea](https://github.com/lootup-team/nestjs-amqp/commit/01047ea9c364c1a6521b47b3f9eec2e9ff38d7d3))
* remove deprecated param ([bb5e3bb](https://github.com/lootup-team/nestjs-amqp/commit/bb5e3bbdb9de042b3202b0d000eced6655520356))


### chore

* **deps:** upgrade to nestjs v11 ([70c83e1](https://github.com/lootup-team/nestjs-amqp/commit/70c83e110288a8e2d2e93885382dfd4ca205bb37))


### Features

* adds duration to inspection ([fc02543](https://github.com/lootup-team/nestjs-amqp/commit/fc02543a69ba065b78d38f0f97f44b5bbd117400))
* removes ConfigModule ([7193cbb](https://github.com/lootup-team/nestjs-amqp/commit/7193cbb694c6df95119bd7ef09b86b2e4772d6fd))
* renames `delayTime` to `delay` for simplicity ([d314d73](https://github.com/lootup-team/nestjs-amqp/commit/d314d73f503a28bd570028ce4e67b2b98323d6d9))
* simplifies module setup by capturing channel configuration from subscription decorator ([a590ab3](https://github.com/lootup-team/nestjs-amqp/commit/a590ab3837b23338f4361ca9ab676c1ed35db36e))
* use x-correlation-id instead of the context itself ([024ed4f](https://github.com/lootup-team/nestjs-amqp/commit/024ed4f6e59f33665065dfdca3487b32485cd018))


### BREAKING CHANGES

* **deps:** Migrated to new version of library `nestjs` which is not compatible with old versions.
