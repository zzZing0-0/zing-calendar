# v2.15.9 immutable attachment keys

New Task/Journal/Note image and audio attachments use `attachment:<SHA-256 of exact bytes>` keys. An identical byte sequence produces the same key, so concurrent writers of the same key upload identical bytes. A different byte sequence uses a different key. This avoids the accidental divergent-byte race inherent in random-key GET-then-PUT under normal clients. Attachment `id` remains a random UUID for UI identity.

Legacy `attachment:<UUID>` references and blobs are unchanged, including existing links and backups. No migration or B2 deletion is performed. Existing legacy uploads still use the GET-before-PUT fallback; strict atomic non-overwrite is not available for those keys. For hash keys, local and remote bytes are SHA-256 validated before use, and upload is refused if a key doesn't match its content.

Security boundary: this is a content-addressing invariant in the official client, NOT B2-enforced atomic create-only. A malicious or buggy client holding a valid presigned PUT URL can still overwrite a B2 object; concurrent writers with the same content hash but different bytes would require a SHA-256 collision. Full server-enforced immutability would require a different provider/API protocol with a verified atomic write primitive.

Run `npm run build` and `npx playwright test tests/e2e/b2-client-safety-v2154.spec.ts tests/e2e/b2-immutable-v2159.spec.ts` in a fully installed local environment. No production writes in tests. Do not deploy until tests pass and a harmless real upload is checked.
