# Server features in the CloudCannon build

Read when the live site needs a server: auth, accounts, checkout, pages rendered on demand, or API routes the browser calls. The CloudCannon build exists for editing, whether or not CloudCannon hosts the live site. CloudCannon hosting is static only, so a site that needs a server keeps its live site on a host that runs one, and CloudCannon builds the same repository as a static site for editors.

These rules apply to every SSG. Examples use Astro's names; the SSG's `configuration.md` has its own mechanism:

| The site uses | Mechanism                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Astro         | [astro/configuration.md § When the live site runs on an adapter](astro/configuration.md#when-the-live-site-runs-on-an-adapter) |
| Next.js       | [nextjs/configuration.md § When the live site needs a server](nextjs/configuration.md#when-the-live-site-needs-a-server)       |
| Nuxt          | [nuxt/configuration.md § When the live site needs a server](nuxt/configuration.md#when-the-live-site-needs-a-server)           |

## Gate the CloudCannon build on a variable

**MUST:** keep the live site's build as it is, and switch every change the CloudCannon build needs on an environment variable that only the CloudCannon build sets.
**Why:** the live host builds the same repository. A change made for every build takes the server features off the live site too.

Name it `PUBLIC_CLOUDCANNON_BUILD` in every SSG. The `PUBLIC_` prefix lets browser code read it in Astro and SvelteKit. Set it in `.cloudcannon/initial-site-settings.json`:

```json
"build": {
  "environment_variables": [{ "key": "PUBLIC_CLOUDCANNON_BUILD", "value": "true" }]
}
```

CloudCannon reads that file only when it creates the site. On an existing CloudCannon site, the user adds the variable in **Site Settings**.

Read the variable in one place, and branch on that everywhere else.

## Keep editors' pages in the CloudCannon build

**MUST:** keep every page editors work on in the CloudCannon build, prerendered.
**Why:** CloudCannon serves only static output, so a page rendered on demand has no HTML for the Visual Editor to open.

When prerendering a page changes the live site too, **ask the user** first.

## Give server features editing fallbacks

On a page editors work on, keep the UI of each server feature, and stop it depending on the server in the CloudCannon build:

| The page has                                                    | In the CloudCannon build                                                                                                                                                                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Markup the server renders per request                           | Render the same markup with example or build-time data, through a view component both branches share                                                                                                                                             |
| A form, widget or button that calls the server from the browser | Render it, and skip the call under `window.inEditorMode` — see [cloudcannon-visual-editing/editable-regions-internals.md § Detecting the Visual Editor](../cloudcannon-visual-editing/editable-regions-internals.md#detecting-the-visual-editor) |
| A form that posts to the live site's backend                    | See [migrate-to-cloudcannon/audit.md § Forms](../migrate-to-cloudcannon/audit.md#forms)                                                                                                                                                          |

A shared view keeps the fallback's markup and regions identical to the live output. To tell editors a value is an example, see [cloudcannon-visual-editing/visual-editing-reference.md § Mark parts editors can't change](../cloudcannon-visual-editing/visual-editing-reference.md#mark-parts-editors-cant-change).

## Leave out server-only routes editors don't open

Leave API routes, and pages editors never open that need a server (sign-in, account, checkout steps), out of the CloudCannon build. They have nothing to edit. When leaving a route out changes files the live site builds from, **ask the user** first.

## Keep server secrets on the live host

Server secrets (API keys, webhook URLs) belong on the live host. Set one in the CloudCannon build only when the build reads it at build time.

## Tell the user at handoff

The handoff tells the user that the live site stays on a host that runs its server features — see [migrate-to-cloudcannon/handoff.md § What to ask the user to verify](../migrate-to-cloudcannon/handoff.md#what-to-ask-the-user-to-verify).
