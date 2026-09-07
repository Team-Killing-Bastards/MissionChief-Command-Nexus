# Chrome publishing

The Chrome job depends on the shared verification job, not the Edge submission job. Both consume the same verified ZIP. Chrome uses the existing item `pheccockibcappcdgonjjfcmlkemmaln` and preserves its visibility. Approved updates publish automatically through `DEFAULT_PUBLISH`; store review is not skipped.

Authentication uses GitHub OIDC through Google's Workload Identity Federation. No JSON private key or GitHub Google credential secret is used: the organisation blocks service-account key creation. The Chrome API is enabled in `trans-falcon-507919-f8`; the service account `nexus-chrome-publisher@trans-falcon-507919-f8.iam.gserviceaccount.com` is linked to the Chrome publisher.

The proposed provider is `projects/809679386301/locations/global/workloadIdentityPools/nexus-github/providers/github-main`. It maps `google.subject=assertion.sub`. Its condition requires repository ID `1305627141`, repository `Team-Killing-Bastards/MissionChief-Command-Nexus`, ref `refs/heads/main`, workflow `Team-Killing-Bastards/MissionChief-Command-Nexus/.github/workflows/edge-extension.yml@refs/heads/main`, and excludes `pull_request` and `pull_request_target` events.

Only the principal `principal://iam.googleapis.com/projects/809679386301/locations/global/workloadIdentityPools/nexus-github/subject/repo:Team-Killing-Bastards/MissionChief-Command-Nexus:ref:refs/heads/main` should receive `roles/iam.workloadIdentityUser` on that one service account. It needs no project-wide roles. Linking the account to Chrome grants access to the publisher's items. The provider and IAM binding still require completion; do not merge until that setup is finished.

The main workflow first validates access with `node scripts/publish-chrome.mjs --check`. This only reads store status using the short-lived token. A green PR run is not proof of configured credentials. Activation is not complete until the authenticated status check and main workflow succeed.

Every new release must increase the extension manifest version. Existing published versions are skipped; an existing different submission, policy warning or uncertain upload stops the job without cancelling review. Durable draft GitHub releases named `Chrome VERSION` record package hashes and operation phases. Never reset an uncertain receipt without checking the Chrome dashboard. Failed HTTP messages omit credentials.

The initial 3.0.43.17 listing was submitted manually. This implementation does not prove later browser delivery; that must be checked after the first higher version passes Google's review.

References: https://developer.chrome.com/docs/webstore/service-accounts and https://developer.chrome.com/docs/webstore/using-api
