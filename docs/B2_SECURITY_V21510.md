# v2.15.10 B2 security regression coverage

- Keep the v2.15.5 authorization and repository checks. Test that PUT signing fails without credentials, from cross-site requests, or with revoked credentials.
- Existing B2 S3-compatible PUT cannot enforce atomic create-only semantics via `If-None-Match: *` in the observed deployment. A preflight GET is not an atomic substitute.
- New notes audio recordings now also use SHA-256 content-addressed keys. Legacy UUID attachments remain readable.
- Test legacy downloads and corrupted remote SHA-256 object rejection.
- **Residual risk:** a holder of a valid presigned PUT URL can still overwrite an object until expiration. The application cannot promise strict server-side immutability. Do not represent this as an equivalent replacement for atomic create-only enforcement.
- Production B2 upload and concurrent-device behavior require separate verification; no production B2 objects are modified by these tests.
- Integrate the already-published remote v2.15.5 commit without rewriting existing tags.
