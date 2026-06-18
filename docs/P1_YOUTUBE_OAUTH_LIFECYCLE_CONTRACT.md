# P1 YouTube OAuth Lifecycle Contract

This contract defines safe OAuth state handling before any real Google OAuth execution exists.

The contract issues a raw state value only once to the caller and stores only hashes plus safe metadata. Callback validation can verify state, redirect binding, expiry, and authorization-code presence, but it still does not permit network calls, authorization-code exchange, refresh, revocation execution, or token persistence.

Token exchange and refresh are explicitly blocked pending future owner scope. Revocation is only planned as a runbook state; no revocation request is executed.
