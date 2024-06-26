# Change Log

## 0.19.4

### Patch Changes

- 87e6b83: amqp reconnect workaround
- Updated dependencies [87e6b83]
  - @nezuchan/kanao-schema@0.10.2

## 0.19.3

### Patch Changes

- 09478df: Create own channel for query

## 0.19.2

### Patch Changes

- c4ed932: Fix cache query

## 0.19.1

### Patch Changes

- 9ec3d02: Fix drizzle schema migrations not generated earlier
- Updated dependencies [9ec3d02]
  - @nezuchan/kanao-schema@0.10.1

## 0.19.0

### Minor Changes

- 8a7e282: Fix guild member schema and update dependencies

### Patch Changes

- Updated dependencies [8a7e282]
  - @nezuchan/kanao-schema@0.10.0

## 0.18.0

### Minor Changes

- 5823f1e: Use Postgres Indexes for frequent column queries and Use Postgres Proxy for client querying instead

### Patch Changes

- Updated dependencies [5823f1e]
  - @nezuchan/kanao-schema@0.9.0

## 0.17.0

### Minor Changes

- 60b55ce: remove constraint

### Patch Changes

- Updated dependencies [60b55ce]
  - @nezuchan/kanao-schema@0.8.0

## 0.16.7

### Patch Changes

- d2691d8: bump deps
- Updated dependencies [d2691d8]
  - @nezuchan/kanao-schema@0.7.4

## 0.16.6

### Patch Changes

- 85bf2e5: drop relation stuff
- Updated dependencies [85bf2e5]
  - @nezuchan/kanao-schema@0.7.3

## 0.16.5

### Patch Changes

- b0d6ebc: bump deps
- Updated dependencies [b0d6ebc]
  - @nezuchan/kanao-schema@0.7.2

## 0.16.4

### Patch Changes

- d4d0e48: fix notInArray

## 0.16.3

### Patch Changes

- 20ea155: Intellegent delete and other updates

## 0.16.2

### Patch Changes

- 22df4b3: Don't assert durable queue
- 3224a69: don't prefetch

## 0.16.1

### Patch Changes

- cddc478: bump @nezuchan/constants
- Updated dependencies [cddc478]
  - @nezuchan/kanao-schema@0.7.1

## 0.16.0

### Minor Changes

- 7cc6cd1: AMQP queues revamp

### Patch Changes

- Updated dependencies [7cc6cd1]
  - @nezuchan/kanao-schema@0.7.0

## 0.15.0

### Minor Changes

- 83adeb3: revert queue changes

## 0.14.0

### Minor Changes

- bcb8e97: stability updates

### Patch Changes

- Updated dependencies [bcb8e97]
  - @nezuchan/kanao-schema@0.6.0

## 0.13.0

### Minor Changes

- 684575e: add sharCount option to client

### Patch Changes

- Updated dependencies [684575e]
  - @nezuchan/kanao-schema@0.5.0

## 0.12.0

### Minor Changes

- f3f75dd: replace postgres.js to node-postgres

## 0.11.0

### Minor Changes

- cf6d6ab: dont make session id unique

### Patch Changes

- Updated dependencies [cf6d6ab]
  - @nezuchan/kanao-schema@0.4.0

## 0.10.2

### Patch Changes

- df8afb9: properly resolve role

## 0.10.1

### Patch Changes

- 8e33162: properly check deferred
- Updated dependencies [8e33162]
  - @nezuchan/kanao-schema@0.3.1

## 0.10.0

### Minor Changes

- 99b4b9b: schema update

### Patch Changes

- Updated dependencies [99b4b9b]
  - @nezuchan/kanao-schema@0.3.0

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.7.3](https://github.com/NezuChan/library/compare/@nezuchan/core@0.7.2...@nezuchan/core@0.7.3) (2024-01-01)

**Note:** Version bump only for package @nezuchan/core

## [0.7.2](https://github.com/NezuChan/library/compare/@nezuchan/core@0.7.1...@nezuchan/core@0.7.2) (2024-01-01)

### Bug Fixes

- **deps:** update dependency @nezuchan/constants to ^0.7.0 ([#61](https://github.com/NezuChan/library/issues/61)) ([7da15c1](https://github.com/NezuChan/library/commit/7da15c1889b523576ce9ff8b09dd30957ac1acd5))

## [0.7.1](https://github.com/NezuChan/library/compare/@nezuchan/core@0.7.0...@nezuchan/core@0.7.1) (2024-01-01)

### Bug Fixes

- **deps:** update dependency @nezuchan/utilities to ^0.6.2 ([#60](https://github.com/NezuChan/library/issues/60)) ([ca1513a](https://github.com/NezuChan/library/commit/ca1513aba21f544a237e0e76f39f79a9e178590b))

# [0.7.0](https://github.com/NezuChan/library/compare/@nezuchan/core@0.6.21...@nezuchan/core@0.7.0) (2023-12-31)

### Bug Fixes

- **deps:** update all non-major dependencies ([#50](https://github.com/NezuChan/library/issues/50)) ([ce1f360](https://github.com/NezuChan/library/commit/ce1f36082841e6cb2040d7f4d6f34a1a7cd9cf23))
- **deps:** update dependency @sapphire/pieces to v4 ([#54](https://github.com/NezuChan/library/issues/54)) ([523bfde](https://github.com/NezuChan/library/commit/523bfdeb8ffdce7667bf7fd06a9466f201f71c50))
- **deps:** update dependency @sapphire/utilities to ^3.15.1 ([8e259bc](https://github.com/NezuChan/library/commit/8e259bc985ec313796d2856062c1393ede1fb456))

## [0.6.21](https://github.com/NezuChan/library/compare/@nezuchan/core@0.6.20...@nezuchan/core@0.6.21) (2023-12-07)

### Bug Fixes

- update option ([0d730cd](https://github.com/NezuChan/library/commit/0d730cdf801be8282b4f2eab26f67e3953dc478d))

## [0.6.20](https://github.com/NezuChan/library/compare/@nezuchan/core@0.6.19...@nezuchan/core@0.6.20) (2023-12-07)

### Bug Fixes

- add option to set http proxy ([a94d1a8](https://github.com/NezuChan/library/commit/a94d1a8f51a2c72453d5b92aabcbdc411de1477a))
- **deps:** update all non-major dependencies ([ed77e7f](https://github.com/NezuChan/library/commit/ed77e7f22fbc6d32a4c136fef4c4647a02725543))
- **deps:** update sapphire dependencies ([3a34b73](https://github.com/NezuChan/library/commit/3a34b73e086a41be67e0c1b962bc7761033435f8))

## [0.6.19](https://github.com/NezuChan/library/compare/@nezuchan/core@0.6.18...@nezuchan/core@0.6.19) (2023-11-18)

### Bug Fixes

- **deps:** update all non-major dependencies ([#22](https://github.com/NezuChan/library/issues/22)) ([002d346](https://github.com/NezuChan/library/commit/002d3469048b0f2df180340b11fb76233f7deaaf))
- **deps:** update all non-major dependencies ([#35](https://github.com/NezuChan/library/issues/35)) ([2817e59](https://github.com/NezuChan/library/commit/2817e59f298aab90662d40eea94e2d80a8736241))
- **deps:** update dependency @sapphire/pieces to ^3.10.0 ([f3cde93](https://github.com/NezuChan/library/commit/f3cde93376026fd81465f915d3052e3721336efc))
- **deps:** update dependency @sapphire/pieces to ^3.7.1 ([0f52f03](https://github.com/NezuChan/library/commit/0f52f03d3357f0cebe1c541df748184f53b8d2c9))
- **deps:** update dependency @sapphire/pieces to ^3.9.0 ([4bd85e8](https://github.com/NezuChan/library/commit/4bd85e86b973bbdf1294e004c75836094ea85559))
- wrong function name and return-data ([#42](https://github.com/NezuChan/library/issues/42)) ([1d8e7d9](https://github.com/NezuChan/library/commit/1d8e7d9067a844c599b47ead1095c492e49576cf))

### Features

- append `with_counts` to fetch guild query ([#33](https://github.com/NezuChan/library/issues/33)) ([14bf58c](https://github.com/NezuChan/library/commit/14bf58c4ad38031c7911f41fdbd4f15691865587))

## [0.6.18](https://github.com/NezuChan/library/compare/@nezuchan/core@0.6.17...@nezuchan/core@0.6.18) (2023-09-24)

### Bug Fixes

- add option to fetch if not cached ([a2b39e2](https://github.com/NezuChan/library/commit/a2b39e22da4c824088d48cd5fb9f099516d8a065))

## [0.6.17](https://github.com/NezuChan/library/compare/@nezuchan/core@0.6.16...@nezuchan/core@0.6.17) (2023-09-16)

### Bug Fixes

- properly return channel name ([12def06](https://github.com/NezuChan/library/commit/12def06706821b90165dc2f3de5e29e64b35cada))

## [0.6.16](https://github.com/NezuChan/library/compare/@nezuchan/core@0.6.15...@nezuchan/core@0.6.16) (2023-09-13)

### Bug Fixes

- properly sort roles based on position ([8d1d8d2](https://github.com/NezuChan/library/commit/8d1d8d273885ac9d16510a7308563da7811f81da))

## [0.6.15](https://github.com/NezuChan/library/compare/@nezuchan/core@0.6.14...@nezuchan/core@0.6.15) (2023-09-09)

**Note:** Version bump only for package @nezuchan/core

## [0.6.14](https://github.com/NezuChan/library/compare/@nezuchan/core@0.6.13...@nezuchan/core@0.6.14) (2023-09-09)

**Note:** Version bump only for package @nezuchan/core

## [0.6.13](https://github.com/NezuChan/library/compare/@nezuchan/core@0.6.12...@nezuchan/core@0.6.13) (2023-09-07)

### Bug Fixes

- ack to amqp message ([9a4c776](https://github.com/NezuChan/library/commit/9a4c776c430cc14d06d12b361ce8557ddf0d395f))

### Features

- add socket.io to fastify-plugin ([#6](https://github.com/NezuChan/library/issues/6)) ([d1acf54](https://github.com/NezuChan/library/commit/d1acf54389abf43d2f637667d4e593a1db0eff55))

## 0.6.12 (2023-08-27)

### Bug Fixes

- tsconfig couldnt create declaration ([274bd93](https://github.com/NezuChan/library/commit/274bd937c48d2c9fe39d2eca11aad72c8a7a9879))

### Features

- add core libs ([7e2b126](https://github.com/NezuChan/library/commit/7e2b12634e8bd279ef120717965c72e8975a1bf9))
- use pnpm workspace version ([0593064](https://github.com/NezuChan/library/commit/05930644af446f6d82511c1ce4d921e9f800f150))
