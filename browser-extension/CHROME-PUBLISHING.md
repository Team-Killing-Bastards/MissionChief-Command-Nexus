# Chrome publishing

The Chrome job depends on the shared verification job, not the Edge submission job. Both consume the same verified ZIP. Chrome uses the existing item `pheccockibcappcdgonjjfcmlkemmaln` and preserves its visibility. Approved updates publish automatically through `DEFAULT_PUBLISH`; store review is not skipped.

Activation requires a Google Cloud service account linked in the Chrome publisher settings, the Chrome Web Store API enabled in its project, the JSON credential saved as the GitHub Actions secret `CHROME_SERVICE_ACCOUNT_JSON`, and the repository variable `CHROME_PUBLISH_ENABLED=true`. Do not commit the credential. The service account needs no Google Cloud project roles for Chrome publishing. Linking it grants access to the publisher's items.

Before activation, validate access with `node scripts/publish-chrome.mjs --check` in the trusted main workflow environment. This only reads store status. A green skipped job is not proof of configured credentials. Activation is not complete until the authenticated status check and main workflow succeed.

Every new release must increase the extension manifest version. Existing published versions are skipped; an existing different submission, policy warning or uncertain upload stops the job without cancelling review. Durable draft GitHub releases named `Chrome VERSION` record package hashes and operation phases. Never reset an uncertain receipt without checking the Chrome dashboard. Failed HTTP messages omit credentials.

The initial 3.0.43.17 listing was submitted manually. This implementation does not prove later browser delivery; that must be checked after the first higher version passes Google's review.

References: https://developer.chrome.com/docs/webstore/service-accounts and https://developer.chrome.com/docs/webstore/using-api
