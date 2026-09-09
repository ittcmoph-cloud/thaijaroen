/*
  Phase 2 scaffold: ITA 12-month upload.

  GitHub write operations are intentionally NOT enabled in Worker V1.
  When Phase 1 compatibility passes, this module will be expanded to:
  - upload/replace documents through GitHub Contents API
  - keep GITHUB_TOKEN only in Cloudflare Secrets
  - preserve existing 6-month URLs
  - create a commit for every upload/replace/delete
*/

export function githubPhaseStatus() {
  return { enabled: false, phase: 2 };
}
