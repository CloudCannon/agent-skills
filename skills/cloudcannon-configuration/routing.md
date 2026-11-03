# Headers and redirects

CloudCannon hosting reads response headers and redirects from `.cloudcannon/routing.json`. It replaces a framework's `headers()` and `redirects()` config, simple rewrites, and another host's `_headers`, `netlify.toml` or `vercel.json`. It applies only to sites CloudCannon hosts. Full reference: [Configure custom routing](https://cloudcannon.com/documentation/developer-articles/configure-custom-routing/).

Invalid JSON in the file fails the build.

## Redirects and rewrites (`routes`)

```json
{
  "routes": [
    { "from": "/old-page/", "to": "/new-page/", "status": 308 },
    { "from": "/docs/(.*)", "to": "/guides/$1", "status": 301 }
  ]
}
```

- **`from`** is a regex; capture groups fill `$1`, `$2` in `to`.
- **`status`** `301`, `302`, `307` or `308` redirects. `200` serves `to` at the `from` URL, `404` and `410` return that status.
- **Order** matters: the first rule whose `from` matches wins.

A redirect can point to a URL fragment but can't match one, because the browser never sends the fragment.

## Headers (`headers`)

```json
{
  "headers": [
    {
      "match": "*",
      "headers": [
        { "name": "X-Content-Type-Options", "value": "nosniff" },
        { "name": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "match": "/blog/.*",
      "headers": [{ "name": "X-Robots-Tag", "value": "noindex" }]
    }
  ]
}
```

| `match`         | Applies to                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `"*"`           | Every path on the site                                                                                                        |
| Any other value | Paths matching it as a regex anchored `^…$`, such as `"/blog/.*"`; an invalid regex makes the request fail with an error page |

- **The first matching rule wins** for each header name.
- **Any matching rule turns off** the default `Access-Control-Allow-Origin: *`. Set it in the rule when the site still needs CORS.
- **`Strict-Transport-Security`** loses `includeSubDomains` on the site's CloudCannon domain, and keeps it on custom domains.

**MUST:** use only these header names (case-insensitive). When porting headers, drop or replace any other name.

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Methods`
- `Content-Security-Policy`
- `Content-Security-Policy-Report-Only`
- `Content-Type`
- `Expect-CT`
- `Large-Allocation`
- `Permissions-Policy`
- `Referrer-Policy`
- `SourceMap`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-Robots-Tag`
- `X-XSS-Protection`

**MUST NOT:** copy `X-Frame-Options: DENY`, or a `Content-Security-Policy` whose `frame-ancestors` excludes CloudCannon.
**Why:** the Visual Editor shows the site in a frame.

## Generated at build time

A build step can write the file to `_cloudcannon/routing.json` in the output directory instead, and CloudCannon uses it in place of `.cloudcannon/routing.json`. Use this when the rules come from data the build reads, or differ per environment.
