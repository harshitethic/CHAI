# Security Policy — CHAI

CHAI is a desktop automation project and treats tool execution and account sessions as high-trust operations. **Pre-release warning:** Do not use unstable builds with production credentials or important unsaved files.

## Report a vulnerability

Use GitHub's **Report a vulnerability** (private security advisory) on the project repository if enabled. Do not open public issues containing session tokens, passwords, personal information or exploitable credentials.

## Supported versions

At initial development only the latest actively maintained release receives fixes. A maintainer must update this table after releases exist.

## Security defaults

Least-privileged workspace access, explicit irreversible-action approval, no cookie extraction, constrained Electron renderer/webviews, scoped tool gateway, local data by default, authenticated provider origin, no hidden background surveillance, no provider quota bypass.

For architecture, threat model and required regression tests see `docs/SECURITY.md`.
