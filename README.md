# NeonManga

A mobile-friendly manga/manhwa discovery website with multi-catalogue search.

## Current starter features
- Responsive dark neon interface designed for mobile.
- Searches the MangaDex catalogue and AniList GraphQL catalogue in parallel.
- Merges results and removes duplicate titles.
- If one source fails, results from the other source can still appear.
- Links readers to third-party catalogue pages; this site does not host comic pages.

## Publish with GitHub Pages
1. Open repository **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose branch `main` and folder `/(root)`, then press **Save**.
5. Wait for GitHub Pages to publish the site.

## Important notes
This is an early frontend starter, not a full Mihon extension runtime. Browser-based sources can fail because of provider APIs, CORS, rate limits, or policy changes. Only add sources whose terms allow the intended use, follow attribution/removal requirements, and do not bypass paywalls or access controls. Check each provider's current terms before monetizing.

## Data providers
- [MangaDex API](https://api.mangadex.org/docs/)
- [AniList API](https://docs.anilist.co/)
