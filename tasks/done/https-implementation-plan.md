# HTTPS for the Docker Deployment — Implementation Plan

## Original task (`tasks/todo/https.md`, deleted when this plan was filed)

> Follow-up from the web-app conversion (`tasks/done/convert-to-web-app-implementation-plan.md`, D5.3 and §11).
>
> The server speaks plain HTTP. Login and file passwords therefore cross the network unencrypted for anything
> other than localhost, and `docker-compose.yml` binds to 127.0.0.1 by default for that reason.
>
> * Serve HTTPS: either TLS in the container (`Bun.serve({ tls })` with mounted certificate files), or a
>   documented reverse-proxy setup (Caddy/Traefik/nginx) with `CHECQUERY_TRUST_PROXY=true`. Decide which.
> * Add `Secure` to the `checquery_session` cookie when served over HTTPS.
> * With a secure context, the inline calculator's copy-to-clipboard also starts working off-localhost.

## Decisions (agreed with the user, 2026-10-15)

- **Scope: the Docker deployment only.** `bun run dev` / `bun run start` stay plain HTTP.
- **A Caddy reverse proxy in front of Checquery**, issuing certificates from **Caddy's own local certificate
  authority** (`tls internal`). This is free and works with the LAN-only name `mnserver.internal`, which Let's
  Encrypt can't issue for: `.internal` is a reserved private-use suffix. Each client computer installs Caddy's
  root certificate once; until then browsers show the usual untrusted-certificate warning.
- **Port 8443, not 443.** Port 443 on this host already belongs to an unrelated container
  (`utmimic-documentation`, nginx with a baked-in self-signed certificate, answering every hostname). The URL
  becomes `https://mnserver.internal:8443`.
- Not chosen: TLS inside Bun (manual certificates, manual renewal), and Let's Encrypt via DNS-01 (needs a public
  domain; this design can switch to it later by changing only the Caddyfile).

---

## 1. Target shape

```
LAN client ──HTTPS :8443──▶ caddy (container) ──HTTP :3000, compose network only──▶ checquery (container)
```

- **`caddy`** is the only published service: `${CHECQUERY_BIND_ADDRESS:-127.0.0.1}:${CHECQUERY_HTTPS_PORT:-8443}:8443`.
- **`checquery`** loses its `ports:` entirely. It's reachable only from the compose network, so plain HTTP never
  touches the LAN. That's also what makes `CHECQUERY_TRUST_PROXY=true` safe: every request really did come
  through Caddy.
- `CHECQUERY_HOST_PORT` becomes unused and is removed from `docker-compose.yml`, `.env.example`, and CLAUDE.md.
  The user's own `.env` has `CHECQUERY_HOST_PORT=3100`; it's harmless but worth deleting (§6).

## 2. Caddy configuration

### 2.1 `deploy/Caddyfile` (new)

```
{
	# The container listens on 8443 (published on the same host port by default). Caddy's automatic
	# HTTP->HTTPS redirect would need port 80, which isn't published, so turn it off.
	https_port 8443
	auto_https disable_redirects
	# Don't try to install the local root into the container's own trust store; clients install it instead.
	skip_install_trust
}

{$CHECQUERY_TLS_HOSTS:localhost} {
	tls internal
	reverse_proxy checquery:3000
}
```

- **`CHECQUERY_TLS_HOSTS`** is a comma-separated list of the names and addresses clients will use, e.g.
  `mnserver.internal, 10.168.168.160`. Caddy issues one certificate covering all of them; IP addresses work
  with `tls internal`. The default `localhost` keeps a fresh checkout working on its own machine. A request for
  a name that isn't listed fails the TLS handshake, which is the correct behavior.
- `reverse_proxy` keeps the original `Host` header and sets `X-Forwarded-For`, `X-Forwarded-Proto: https`,
  and `X-Forwarded-Host`. Since Caddy 2.5 it **replaces** any `X-Forwarded-*` a client sent itself (no
  `trusted_proxies` configured), so the first `X-Forwarded-For` hop that `clientIp.ts` reads is the real client.
  Verify this in §7.
- Certificate lifetimes with `tls internal`: the root lasts about 10 years, the intermediate about 7 days, and
  the server certificate about 12 hours, all renewed automatically. Clients trust only the root, so renewals
  are invisible to them.

### 2.2 `docker-compose.yml`

```yaml
services:
  checquery:
    build: .
    image: checquery:latest
    # No ports: reachable only through caddy (below).
    volumes:
      - checquery-data:/data
    environment:
      CHECQUERY_USER1_NAME: ...                  # unchanged
      CHECQUERY_TRUST_PROXY: "true"              # client IP and protocol come from Caddy's X-Forwarded-* headers
      ...
    restart: unless-stopped
    stop_grace_period: 30s

  caddy:
    image: caddy:2.10-alpine
    ports: ["${CHECQUERY_BIND_ADDRESS:-127.0.0.1}:${CHECQUERY_HTTPS_PORT:-8443}:8443"]
    volumes:
      - ./deploy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data            # the local CA's root key/certificate -- see §4
      - caddy-config:/config
    environment:
      CHECQUERY_TLS_HOSTS: ${CHECQUERY_TLS_HOSTS:-localhost}
    depends_on:
      checquery:
        condition: service_healthy
    restart: unless-stopped

volumes:
  checquery-data:
  caddy-data:
  caddy-config:
```

- Pin the Caddy image to a specific minor version (`2.10-alpine`, or whichever 2.x is current when implemented),
  for the same reason the Bun image is pinned.
- `depends_on: service_healthy` uses the existing Checquery healthcheck, so Caddy never proxies to a server
  that isn't up yet.
- The old "bind-mount `./data`" comment stays on the `checquery` service.

## 3. App changes (server)

All small; none touch dev behavior because `trustProxy` is off outside Docker.

### 3.1 Turn off HSTS (the important one)

`secureHeaders()` in `app.ts` sends `Strict-Transport-Security: max-age=15552000; includeSubDomains` by default.
Browsers ignore that over plain HTTP, which is why it's harmless today. Once Checquery is served over HTTPS,
browsers will honor it: **HSTS applies to the whole hostname, every port**. For six months, `mnserver.internal`
would then be forced to HTTPS everywhere, breaking:

- `http://mnserver.internal:3100` (dev);
- the private registry's web endpoints on `:5000`, if anything browses them;
- any other plain-HTTP service on that host.

Set `strictTransportSecurity: false` in the `secureHeaders` options, with a comment saying why. If HSTS is ever
wanted, it belongs in Caddy, scoped deliberately.

### 3.2 `Secure` session cookie

`routes/authRoutes.ts` sets `checquery_session` with `httpOnly`, `sameSite: "Strict"`, `path: "/"`. Add
`secure: requestIsHttps(c, config.trustProxy)` to both `setCookie` and `deleteCookie`. The helper goes in a new
`requestProtocol.ts`, next to `clientIp.ts`:

```ts
/** True if the browser's connection was HTTPS: the request URL itself, or -- only when trusting a proxy -- the
 * proxy's X-Forwarded-Proto. */
export function requestIsHttps(c: Context, trustProxy: boolean): boolean
```

Without `trustProxy`, a client could otherwise set `X-Forwarded-Proto: https` itself and get a `Secure`
cookie it then can't send back over HTTP. That's harmless but confusing, so the header is ignored unless the
proxy is trusted.

### 3.3 CSRF origin check behind the proxy

`csrf()` currently uses its defaults: a non-GET form-like or body-less request passes if `Sec-Fetch-Site` is
`same-origin`, or else if `Origin` equals the request URL's origin. Behind Caddy, the request URL Bun sees is
`http://mnserver.internal:8443/...`: `Host` is preserved, but the scheme is `http`. So an `Origin` of
`https://mnserver.internal:8443` would fail the origin fallback.

Current browsers all send `Sec-Fetch-Site`, so in practice the first check passes. But the fallback should be
right too:

- pass `csrf({ origin: (origin, c) => origin === expectedOrigin(c) })`;
- `expectedOrigin` builds `proto://host` from `X-Forwarded-Proto` / `X-Forwarded-Host` when `trustProxy` is set,
  otherwise from the request URL (the same helper module as §3.2).

### 3.4 No other server changes

- `clientIp.ts` already honors `X-Forwarded-For` under `trustProxy`.
- The healthcheck runs inside the Checquery container over HTTP and is unaffected.
- CSP is unaffected; same-origin stays same-origin.
- No new server environment variables: HTTPS is detected per request.

## 4. The local certificate authority: lifecycle and security

- **Where it lives:** `caddy-data` volume, `/data/caddy/pki/authorities/local/` (`root.crt` and `root.key`, plus
  the intermediate).
- **Keep the volume.** `docker compose down` keeps it. `down -v`, or deleting `caddy-data`, makes a *new* root,
  and every client then has to install the new one. Say so in the docs, next to the existing
  `checquery-data` warning.
- **Back it up** along with `checquery-data` if you back up volumes.
- **Security note for the docs:** a client that trusts this root will trust *any* certificate it signs, for any
  domain. Whoever can read `root.key` (anyone with Docker access on this host) could impersonate other sites to
  those clients. That's acceptable for a personal home server whose Docker access you already control. Don't
  install the root on machines other people manage.

## 5. Client setup (one-time per computer)

Export the root certificate, then install it as a trusted root.

```sh
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./checquery-root.crt
```

Steps for the docs, kept short:

- **Ubuntu/Kubuntu (system tools):**
  `sudo cp checquery-root.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates`.
- **Chrome/Chromium on Linux** use their own NSS store:
  `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "Checquery local CA" -i checquery-root.crt`
  (from `libnss3-tools`), or Settings → Privacy and security → Security → Manage certificates → Authorities →
  Import.
- **Firefox:** Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import → "Trust
  this CA to identify websites". On Linux, alternatively set `security.enterprise_roots.enabled` to use the
  system store.
- **Windows:** double-click → Install Certificate → Local Machine → "Trusted Root Certification Authorities"
  (or `certutil -addstore Root checquery-root.crt` as admin). Chrome and Edge use this store; Firefox needs the
  step above or `security.enterprise_roots.enabled`.
- **macOS:** open in Keychain Access (System keychain) → Get Info → Trust → "Always Trust".
- **iOS/Android:** possible (install profile, then enable full trust) but fiddly; document as optional.

Firewall: if `ufw` is active, `sudo ufw allow 8443/tcp`. Port 3100 no longer needs to be open for Docker.

## 6. Configuration and docs

- **`.env.example`:** replace the `CHECQUERY_HOST_PORT` block with:
  ```
  # Docker Compose only. Checquery is served over HTTPS by the caddy service (Caddy's local CA -- install its
  # root certificate on each client; see CLAUDE.md). Names/addresses clients will use, comma-separated:
  # CHECQUERY_TLS_HOSTS=mnserver.internal, 10.168.168.160
  # CHECQUERY_HTTPS_PORT=8443
  # CHECQUERY_BIND_ADDRESS=127.0.0.1          # 0.0.0.0 to allow other computers on the LAN
  ```
- **The user's `.env`** (not in git; tell the user rather than edit it): add
  `CHECQUERY_TLS_HOSTS=mnserver.internal, 10.168.168.160`, keep `CHECQUERY_BIND_ADDRESS=0.0.0.0`, and drop
  `CHECQUERY_HOST_PORT=3100`.
- **CLAUDE.md:** update the Docker command bullet and the Architecture "Docker" paragraph with the Caddy
  front-end, the 8443 URL, the `caddy-data` warning, and a pointer to the client setup. Add `deploy/` to the
  layout description. Remove "HTTPS is a pending follow-up".
- **`docker-compose.yml` header comment:** add how to export the root certificate.
- **The client setup steps (§5)** go in a new `deploy/README.md`, linked from CLAUDE.md, so CLAUDE.md stays
  short.

## 7. Tests and verification

**Automated** (server package):

- `requestProtocol.test.ts`:
  - `requestIsHttps` is true for an `https:` URL;
  - it honors `X-Forwarded-Proto` only under `trustProxy`;
  - `expectedOrigin` uses the forwarded host and protocol under `trustProxy`, and the request URL otherwise.
- `auth.http.test.ts`:
  - login under `trustProxy` with `X-Forwarded-Proto: https` sets a cookie containing `Secure`;
  - without the header, or without `trustProxy`, no `Secure`;
  - logout's clearing cookie matches.
- `auth.http.test.ts`, CSRF: a form-style POST with no `Sec-Fetch-Site` and
  `Origin: https://mnserver.internal:8443`, behind trusted forwarded headers, is accepted. A mismatched
  `Origin` is still 403.
- `static.http.test.ts`: `Strict-Transport-Security` is absent.

**Manual / end-to-end** (as in the conversion's Phase 5):

1. `docker compose up -d --build` with
   `CHECQUERY_TLS_HOSTS=mnserver.internal, 10.168.168.160` and `CHECQUERY_BIND_ADDRESS=0.0.0.0`.
2. Check the setup:
   - `docker compose cp` the root certificate;
   - `curl --cacert checquery-root.crt https://mnserver.internal:8443/api/health` and
     `https://10.168.168.160:8443/api/health` both succeed;
   - plain `curl` without the CA fails verification, as expected;
   - nothing listens on 3100/3000 for Checquery anymore.
3. Run the headless-Chrome flow from the conversion against `https://mnserver.internal:8443`, with the root
   certificate trusted (or `--ignore-certificate-errors` as a fallback), and check:
   - the session cookie has `Secure`;
   - there's no HSTS header;
   - the audit Origin (`GET /api/file/info` → origins) shows the client's LAN IP, not Caddy's container IP. If
     it shows a Docker bridge IP, Docker's userland proxy is in the path; note it and decide then.
4. From the other computer, after installing the root certificate: a clean padlock, sign in, open a file, and
   the calculator's copy button works.
5. `docker compose down && docker compose up -d`: the same root certificate (compare the files' fingerprints),
   and no new warnings on clients.

## 8. Phases (one commit each)

1. **Server:** HSTS off, `requestProtocol.ts`, `Secure` cookie, CSRF origin check, plus tests.
2. **Deployment:** `deploy/Caddyfile`, `docker-compose.yml` (caddy service, Checquery unpublished, trust proxy,
   new volumes), `.env.example`.
3. **Docs:** `deploy/README.md` (client setup and CA notes), CLAUDE.md, then move this plan to `tasks/done/`
   with notes on any divergences.

## 9. Open questions

None blocking. To revisit later if wanted:

- Switch to trusted certificates (Let's Encrypt via DNS-01) with a public domain or Tailscale's `ts.net`
  names. Only the Caddyfile's `tls` line and the hostname change.
- Move `utmimic-documentation` behind the same Caddy (hostname routing on 443) to consolidate certificates.
  That's out of scope here.

---

## Implementation notes (2026-10-16)

Implemented in three commits, as phased in §8. Divergences from the plan above:

- **Caddy image `caddy:2.11-alpine`**, the current 2.x when implemented, not 2.10.
- **One certificate per host, not one covering all of them.** Caddy issues a separate certificate for each
  name in `CHECQUERY_TLS_HOSTS` (§2.1 said one certificate). That's harmless.
- **New `CHECQUERY_TLS_DEFAULT_SNI`** (Caddyfile global `default_sni`, default `localhost`). A client browsing
  by IP address sends no TLS server name. Inside the container Caddy only sees its own Docker address, so it
  couldn't pick the IP's certificate, and the handshake failed (`tlsv1 alert internal error`). Setting this to
  the listed IP fixes it. It's documented in `.env.example` and `deploy/README.md`.
- **`expectedOrigin(c, trustProxy)`** takes `trustProxy` explicitly, matching `clientIp`. It also normalizes
  through `URL`, so a forwarded default port (`:443`) drops out the way a browser's `Origin` omits it.
- **Client setup lives in `deploy/README.md`,** as planned. It also covers the configuration variables, a
  `curl` check, and the HSTS note.

Verification (§7):

- `bun run test`: 1272 pass (shared 697, server 348, client 227). `bun run typecheck` is clean.
- An isolated stack (project `checquery-httpstest`, port 8444, so the running deployment was untouched) was run
  with `CHECQUERY_TLS_HOSTS=mnserver.internal, 10.168.168.160, localhost` and
  `CHECQUERY_TLS_DEFAULT_SNI=10.168.168.160`.
- **curl:**
  - `curl --cacert` succeeded by name, by IP, and via localhost;
  - without the CA, curl fails verification;
  - a name that isn't listed fails the handshake;
  - there's no HSTS header;
  - the session cookie has `Secure`;
  - a form POST with Origin `https://mnserver.internal:8444` passed CSRF, and `https://evil.example` got 403;
  - client-sent `X-Forwarded-For: 1.2.3.4` / `X-Forwarded-Proto: http` were replaced by Caddy.
- **Client IP:** recorded as `10.168.168.160` over the LAN address. Via `localhost` it's the bridge gateway
  `172.19.0.1` (Docker's loopback proxy), as noted in the README.
- **Root certificate:** its fingerprint was unchanged after the caddy container was recreated.
- **Headless Chrome** (with `--ignore-certificate-errors`; `certutil` isn't installed here):
  - `isSecureContext` is true and `navigator.clipboard` is present;
  - sign-in works, and the cookie is `Secure`/`HttpOnly`/`Strict`;
  - opening the encrypted file works;
  - no page errors.
- **Not done here:** step 4 from a second computer with the root installed, which is for the user.
