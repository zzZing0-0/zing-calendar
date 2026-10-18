# v2.15.8 — Correct divergent attachment regression expectation

The sync contract deliberately catches B2 transfer errors after the GitHub structured-data commit and returns `attachmentWarning` to the UI rather than rejecting the whole sync promise. The v2.15.7 divergent-object test incorrectly expected a thrown error. This revision asserts that the returned warning contains `附件内容冲突`, no B2 PUT occurs, and local attachment bytes remain unchanged.

No production upload logic was changed from v2.15.7. GET-before-PUT is not atomic; concurrent overwrite risk remains. Live B2 upload has not been verified. Do not deploy as a proven atomic no-overwrite solution.
