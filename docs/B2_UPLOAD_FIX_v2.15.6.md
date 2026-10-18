# v2.15.6 — B2 conditional PUT compatibility

Real B2 uploads returned HTTP 501 when the `If-None-Match: *` header was included. Remove the unsupported header from presigning and browser PUT; remove the unusable conditional-write verification gate. Keep per-request GitHub authorization and repository ownership checks unchanged, along with B2 garbage collection authorization.

Before uploading, the existing client reads the remote object and only uploads when missing. If both remote and local blobs exist, the client now checks byte-for-byte equality and stops sync on conflict rather than silently accepting divergent data. This **is not an atomic create-only guarantee**: concurrent clients can still race between GET and PUT. B2 bucket version history can mitigate recovery risk, subject to configured lifecycle retention. Do not describe this as security-equivalent to conditional PUT. A strict no-overwrite guarantee requires a provider supporting atomic conditional writes or a separate authoritative lock/transaction mechanism.

`ZING_B2_CONDITIONAL_PUT_VERIFIED` is no longer read by this version and may be removed from Vercel after deployment. Never clear IndexedDB on a device with unsynced attachments. Do not run orphan cleanup until attachments are reconciled.
