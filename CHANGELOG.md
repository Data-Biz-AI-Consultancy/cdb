# [1.23.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.22.1...v1.23.0) (2026-09-01)


### Features

* add activity timeline aggregation to API and implement interactive frontend visualization component ([510c337](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/510c337094cf7d232ab7010a81f4e0ae123b32be))
* implement activity search, pagination, statistics, and eager-loaded relationship support for CRUD operations ([f06d769](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/f06d7697d0dbc3619da6ce93483fbfed41bb7d19))

## [1.22.1](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.22.0...v1.22.1) (2026-09-01)


### Bug Fixes

* introduce SearchableCombobox component and replace static selects in opportunity forms for improved search and selection ([586daad](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/586daad02b5e2b9f8734fd263a46ef2229a59a21))

# [1.22.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.21.0...v1.22.0) (2026-08-31)


### Features

* add internal notes field to opportunity forms and update UI styling for textarea components ([ddb3837](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/ddb38378d7aac7c09becd9fe804abf640809b2c7))
* add overdue opportunity tracking with UI filtering and dashboard visualization ([ab1672d](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/ab1672d87bf48c2ba351522ee86dc22eb0651146))
* implement automated staleness and expiration tracking for opportunities based on inactivity ([4000705](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/4000705f212c064597518b008058507eecd58200))
* implement comprehensive opportunity audit history system and enhance Kanban UI with contact/organization linking functionality. ([5a5c5ae](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/5a5c5ae33cb66b7ba91c375b4d1054898e90aa50))
* update opportunity UI with persistent state filters, expanded activity status badges, and a new deal health information panel in the detail view ([9e88637](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/9e886370fae19af2da19ba6853e3d707af17076a))

# [1.21.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.20.0...v1.21.0) (2026-08-31)


### Features

* add AUTO_BACKFILL_ON_STARTUP configuration to gate background backfill execution ([3d52d7b](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/3d52d7b8faa7bb9fa40006b97d76c116cba34989))
* add stale and expired lead filtering with interactive UI components and backend metadata ([f85bb6a](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/f85bb6aaddab6d9045c4a598e3c29f89c1ed21a7))
* implement automated lead title generation and update leads table layout to include explicit title, intent, and timestamp columns. ([3f41772](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/3f41772643ce6365335678fd1d71919d35feccb1))
* implement bulk actions for leads including update, convert, disqualification, and deletion with associated UI and API endpoints. ([78122d6](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/78122d6604540556b82b21107e354ff234709f7f))
* implement enhanced lead search, sorting, and join-enriched response schema ([ec2d342](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/ec2d342af1522fcf5305864f3045440fc117cda4))
* implement server-side pagination and frontend navigation for leads list ([0937ea6](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/0937ea6c3d066c70173302940f956a4f30c62131))
* optimize lead pipeline management by introducing auto-disqualification for expired leads and updating active stage filters. ([1fcb356](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/1fcb3560e50bb14e1a79155e4a35cc8a8b38b82b))
* split contact and company into separate table columns with updated layout and formatting ([c7a050b](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/c7a050bc17d3fe0e8f535ee2470c12f1e3e2c6dd))

# [1.20.0](https://github.com/Data-Biz-AI-Consultancy/cdb/compare/v1.19.0...v1.20.0) (2026-08-28)


### Features

* add leads tracking and pipeline value to company schemas, services, and directory UI. ([b039aba](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/b039abafa8698d12e987b9467eb9dea1a1a9235c))
* implement automated person resolution and record linking in LinkedIn backfill service ([cdb4c5a](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/cdb4c5a3e595401720607461f865e7ad6ec51454))
* implement company detail page features including employee filtering, sorting, and tabbed view management with unit tests. ([47fda39](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/47fda39f6e831993260f3f7c2f95b93737f2f0df))
* implement multi-tier default sorting and include timestamp fields in company schema ([b2d7e4b](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/b2d7e4bd680adbbffa74316b4e87909390aacabf))
* migrate company sorting and pagination to server-side implementation ([5fe5f4d](https://github.com/Data-Biz-AI-Consultancy/cdb/commit/5fe5f4dc600b7ddfa45b14f2ae73fe898f395abe))

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
