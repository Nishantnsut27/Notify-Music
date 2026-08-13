\## Bug audit



Performed a source-level audit of the current main branch.



\### Verified findings



\- \*\*CRITICAL — Password reset bypass:\*\* Password reset can occur without requiring the previously verified reset OTP/token.

\- \*\*HIGH — Cross-account local data leakage:\*\* Empty cloud collections don't replace existing local favorites/playlists.

\- \*\*MEDIUM — Incomplete account deletion:\*\* SearchHistory records are not removed when an account is deleted.

\- \*\*MEDIUM — Unsafe automatic retries:\*\* Retrying failed mutation requests can potentially duplicate mutations.





