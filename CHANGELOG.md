# [1.19.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.18.0...v1.19.0) (2026-08-28)


### Features

* implement manual and automatic background ingestion backfill service for intake data ([938d9bd](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/938d9bd78635f6cec86e4f556a15b7b53187903a))

# [1.18.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.17.0...v1.18.0) (2026-08-28)


### Features

* add backfill service for LinkedIn company and relationship ingestion with accompanying CLI script ([a7508de](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/a7508de3e8314e553119cf6575a364f427ce4706))
* add note-taking functionality with dedicated tab and activity type support ([a2609d6](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/a2609d6a239728d39ce122a4bad2d29c9150767f))
* enhance person detail view with activity timeline, opportunity tracking, and lead management integrations ([a86d888](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/a86d888feba9e9a219435bea5831daf42af7a754))
* implement automatic Alembic migration execution on application startup and rename revision 0002 ([671a428](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/671a428c50278ab8c4b535570be123da93ae74cf))
* implement backfill services to ingest LinkedIn messages and Notion meeting notes into the activities table ([e77f905](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/e77f905996d4480a955059e698578bb9357ae9b7))
* implement person activity history tracking with database models, API endpoints, and audit logging services ([a65250f](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/a65250f13269b7cb8c06e98ecddf9b61b25849a6))

# [1.17.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.16.0...v1.17.0) (2026-08-27)


### Features

* implement bulk actions, column sorting, and pagination for persons management ([a8ce9ed](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/a8ce9ed1e9e037bd075d5ddff5851765045f9617))

# [1.16.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.15.0...v1.16.0) (2026-08-27)


### Features

* enhance Persons page with multi-field sorting, full pagination controls, bulk editing for dirty records cleanup, and explicit created/last edited timestamp visibility
* enhance entity resolution UI with record details and standardize backend candidate resolution endpoints ([18a4aef](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/18a4aef7aaa8b703538bbb54726719ca0cda4de7))
* implement ML-based entity resolution scoring and add company segmentation support ([7acf2c1](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/7acf2c154a1773ee63643f8cc039b65cb27289cd))

# [1.15.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.14.0...v1.15.0) (2026-08-27)


### Features

* define DashboardCard and DashboardSection interfaces for homepage state management ([6e8334e](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/6e8334eff8745d6042fbc1929fb4d7662dab72c2))
* reorganize navigation into categorized dropdown groups and add engagements and settings pages ([5f3b333](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/5f3b333cc899c0059feffd27a2a0f988494af92e))
* update ingestion link to point to persons view ([ab68d8d](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/ab68d8d3cc2502553f2ecaeec44707365aa4e139))

# [1.14.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.13.0...v1.14.0) (2026-08-27)


### Features

* add custom CdbIcon component and implement branded site favicon and app icons ([e55c81a](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/e55c81a7b7a33920af573af8d939a794bdbb7874))

# [1.13.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.12.0...v1.13.0) (2026-08-27)


### Features

* dynamically fetch and display application version from project configuration files ([3c90f54](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/3c90f5420e281a7f68e2430cd9e84a9adc9c7f9a))

# [1.12.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.11.0...v1.12.0) (2026-08-25)


### Features

* add clone_prod_to_dev.sh script to facilitate database syncing and update documentation ([61a3eb0](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/61a3eb0bc52eef8ad140f27090f16f8e985c1f0c))
* enhance clone script to support automated production connection via IP and flexible .env configuration ([9e0ef3f](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/9e0ef3f6fa260dffb34d55c222240c9518572433))

# [1.11.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.10.0...v1.11.0) (2026-08-25)


### Features

* add Customer Data Platform (CDP) service for processing LinkedIn data and entity resolution ([bd5b049](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/bd5b049f5e800b06c4bbb42e7c2691512dead7db))

# [1.10.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.9.0...v1.10.0) (2026-08-25)


### Features

* allow multiple valid API keys in require_api_key and get_current_user dependencies ([ab4c1c2](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/ab4c1c26b6da0b4fc7a51ba0e04e07e93ed82b40))

# [1.9.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.8.0...v1.9.0) (2026-08-25)


### Features

* remove legacy Jager migration service and update auth to support API key access ([2049a90](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/2049a903d33d4f33090bf8cac4b71d728eb13260))

# [1.8.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.7.0...v1.8.0) (2026-08-25)


### Features

* update description of application packages in README ([7f3dbfa](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/7f3dbfaf7f75aa9dbc23aaae32b50cfe5d332224))

# [1.7.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.6.1...v1.7.0) (2026-08-24)


### Features

* implement database connection fallback mechanism and increment package version to 1.6.1 ([be53bdf](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/be53bdf575d14b64ec9a51f69dd0c3297567005e))

## [1.6.1](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.6.0...v1.6.1) (2026-08-24)


### Bug Fixes

* remove extra newline from README license section ([9fe0ae4](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/9fe0ae4ff35a87e9e664e6df80c98a2e72c359f0))

# [1.6.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.5.1...v1.6.0) (2026-08-24)


### Features

* implement auto-migration service and add silent token refresh to frontend API client ([bae68fa](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/bae68fa51d3d7aaee9899657ad0380ffacc3acc9))

## [1.5.1](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.5.0...v1.5.1) (2026-08-24)


### Bug Fixes

* add trailing newline to README.md license section ([53c0fbd](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/53c0fbd686020198d579bfe9293a60d80b58ba4c))

# [1.5.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.4.0...v1.5.0) (2026-08-24)


### Features

* implement automatic seeding of an initial superuser during application startup ([c7c6de3](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/c7c6de359b3a21a4242d131b44c15789b4bcc4e1))

# [1.4.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.3.0...v1.4.0) (2026-08-24)


### Features

* implement API proxying via Next.js rewrites and update environment configuration ([460bbe0](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/460bbe0fb0b8cf5c2d787a2a4589dd682ebc4aa3))

# [1.3.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.2.0...v1.3.0) (2026-08-24)


### Features

* add jager_network to cdb-api and cdb-worker services ([acaa79b](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/acaa79b87dc52c8f51c8fa5f81fa687f4a2e77f8))

# [1.2.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.1.5...v1.2.0) (2026-08-24)


### Features

* implement automatic PostgreSQL database creation on application startup and migration execution ([8650a61](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/8650a617078b50475d07358f7fb5c59f545639bc))

## [1.1.5](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.1.4...v1.1.5) (2026-08-23)


### Bug Fixes

* **ci:** restore native multi-arch builds using ubuntu-24.04-arm runners ([b0f6d6a](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/b0f6d6ab6ba0dd140a9c2d3e490df66ee1442b28))

## [1.1.4](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.1.3...v1.1.4) (2026-08-23)


### Bug Fixes

* **ci:** use native ARM64 runners for multi-arch builds instead of QEMU ([4fcf379](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/4fcf379a69367de65c294df1df13e53d23e22fd3))

## [1.1.3](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.1.2...v1.1.3) (2026-08-23)


### Bug Fixes

* **ci:** enable multi-arch builds for linux/amd64 and linux/arm64 ([68276c2](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/68276c238dc7666813a9328bac267a8240bb32f8))

## [1.1.2](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.1.1...v1.1.2) (2026-08-23)


### Bug Fixes

* **ci:** add .gitkeep to track empty public/ dir so Docker COPY succeeds ([f0a7105](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/f0a7105298452c10141f3e06ed898e7cbcdb2335))

## [1.1.1](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.1.0...v1.1.1) (2026-08-23)


### Bug Fixes

* **ci:** un-ignore frontend src/lib from gitignore and track api.ts ([0f481d7](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/0f481d7a780ee5b6941c8c278b68af4a3261ccb5))

# 0.1.0 (2026-08-20)


### Bug Fixes

* truncate passwords to 72 bytes in security helpers and add use_alter to opportunity foreign key constraint ([475d492](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/475d49285731059fa87c4684fadbda9aa3327c75))
* update PYTHONPATH in CI workflow to ensure Pytest resolves backend modules correctly ([9b34611](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/9b346119aa60a6fd708b1d349d7f9fcb5c33f6d9))


### Features

* add pull request template to .github directory ([20cba69](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/20cba6968a17aba6730c8c14c86b9d7e710b1ce8))
* implement automated semantic versioning, changelog generation, and tag-based image publishing ([11f9e45](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/11f9e45fb0250875d2fc52401cc04a653da1d05e))
* implement backend API layers, Pydantic schemas, and entity resolution services for activities, persons, leads, companies, and opportunities. ([2e3a428](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/2e3a4286d6a58a643f5da0189c5e216338a2f070))
* implement frontend MVP with Next.js 15 for core modules including Leads, Companies, and Entity Resolution. ([f816746](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/f8167469f43b3f5e2687fc6e17f484bcda41a01c))
* initialize FastAPI backend project with SQLAlchemy models, Alembic migrations, Docker configuration, and CI/CD pipelines ([8340ddb](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/8340ddbca27cc32a06c6b8c83d684db08f924119))
* setup Vitest testing environment and add unit tests for login and navigation components ([d0bb085](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/d0bb08512dc4c0fffd4060e4d2f031e6f955db75))
