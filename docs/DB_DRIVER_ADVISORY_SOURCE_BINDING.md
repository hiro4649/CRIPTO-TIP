# DB Driver Advisory Source Binding

A future advisory source review must bind each safe summary to:

- source category
- source checked timestamp
- target package name
- target package version
- candidate driver
- target commit SHA
- PR number
- safe summary

The current PR does not bind reviewed advisory sources. It only defines the
binding requirements for future DB driver dependency review work.

Future reviewed source timestamps must use ISO UTC seconds. Source checked
timestamps must not be in the future. Future reviewed evidence must be rebound
to the exact dependency PR head and package version; stale source evidence must
not be reused as merge evidence for a later dependency PR.

Raw output remains forbidden even when a future source is reviewed. Operators
must record only safe summaries and bounded metadata.
