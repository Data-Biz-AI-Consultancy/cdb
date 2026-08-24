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
