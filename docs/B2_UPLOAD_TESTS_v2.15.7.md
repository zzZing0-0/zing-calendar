# v2.15.7 — B2 compatibility regression coverage

Update the obsolete test requiring `If-None-Match: *`, which B2 rejected with HTTP 501. Add targeted Playwright coverage for (1) upload of missing remote object without unsupported conditional header, (2) no PUT when the remote bytes match, and (3) fail-closed on differing remote bytes while preserving local data. GitHub bearer token must only be sent to the signing relay.

**Safety limitation:** GET-before-PUT is not atomic and cannot prevent concurrent clients writing the same key between those operations. This release does not claim a strict no-overwrite guarantee. Do not run B2 garbage collection or clear local IndexedDB while attachments are missing. Production upload remains unverified until deployed and tested with a disposable attachment.
