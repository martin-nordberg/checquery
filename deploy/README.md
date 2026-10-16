# HTTPS for the Docker deployment

`docker compose up -d --build` runs two containers:

```
browser ──HTTPS :8443──▶ caddy ──HTTP :3000, compose network only──▶ checquery
```

Caddy (`deploy/Caddyfile`) terminates TLS with certificates from **its own local certificate authority**
(`tls internal`). This is free and works for LAN-only names such as `mnserver.internal`, which a public CA like
Let's Encrypt can't issue for. The catch: each client computer must trust Caddy's root certificate once.
Until then, browsers show an untrusted-certificate warning.

The `checquery` container publishes no port. Plain HTTP never leaves the compose network, which is also what
makes its `CHECQUERY_TRUST_PROXY=true` safe: Caddy replaces any `X-Forwarded-*` headers a client sends.

## Configuration (`.env`)

| Variable | Default | |
|---|---|---|
| `CHECQUERY_TLS_HOSTS` | `localhost` | Names/addresses clients will use, comma-separated, e.g. `mnserver.internal, 10.168.168.160`. Caddy issues a certificate for each. A name not listed fails the TLS handshake. |
| `CHECQUERY_TLS_DEFAULT_SNI` | `localhost` | The host whose certificate is served to clients that send no name, which is what happens when browsing by IP address. If you list an IP above, set this to it. |
| `CHECQUERY_HTTPS_PORT` | `8443` | Host port to publish. |
| `CHECQUERY_BIND_ADDRESS` | `127.0.0.1` | `0.0.0.0` (or one host address) to allow other computers on the LAN. |

Then browse to `https://<host>:8443`.

If `ufw` is active on the host: `sudo ufw allow 8443/tcp`.

## Trusting the root certificate (once per client computer)

Export it on the Docker host:

```sh
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./checquery-root.crt
```

Copy `checquery-root.crt` to each client computer, then install it as a trusted root.

### Ubuntu / Kubuntu

System store, used by curl and most command-line tools:

```sh
sudo cp checquery-root.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates
```

### Chrome / Chromium on Linux

Chrome and Chromium use their own NSS store:

```sh
certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "Checquery local CA" -i checquery-root.crt   # certutil: libnss3-tools
```

Or use Settings → Privacy and security → Security → Manage certificates → Authorities → Import.

### Firefox (any OS)

1. Open Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import.
2. Check "Trust this CA to identify websites".

Alternatively, set `security.enterprise_roots.enabled` to `true` in `about:config` to use the OS store.

### Windows

1. Double-click the file → Install Certificate.
2. Choose Local Machine → "Place all certificates in the following store" → Trusted Root Certification
   Authorities.

Or, as administrator: `certutil -addstore Root checquery-root.crt`. Chrome and Edge use this store.

### macOS

1. Open the file in Keychain Access and add it to the System keychain.
2. Open the certificate, choose Get Info → Trust, and set it to "Always Trust".

### iOS / Android

Possible but fiddly:

- **iOS:** install the profile, then enable full trust under Settings → General → About → Certificate Trust
  Settings.
- **Android:** user-installed CAs aren't trusted by every app.

Check that it worked: a clean padlock at `https://<host>:8443`, or
`curl --cacert checquery-root.crt https://<host>:8443/api/health` → `{"ok":true}`.

## Keep the `caddy-data` volume

The root and intermediate keys live in the `caddy-data` volume (`/data/caddy/pki/authorities/local/`).

- `docker compose down`, `restart`, and image rebuilds keep the volume.
- **`docker compose down -v`, or deleting `caddy-data`, creates a new root.** Every client then has to install
  the new one.
- Back the volume up along with `checquery-data` if you back up volumes.

Certificate lifetimes:

| Certificate | Lifetime |
|---|---|
| Root | about 10 years |
| Intermediate | about 7 days |
| Server certificates | about 12 hours |

Caddy renews the intermediate and server certificates automatically. Clients trust only the root, so the
renewals are invisible to them.

## Security note

A computer that trusts this root trusts **any** certificate it signs, for **any** domain. Whoever can read
`root.key` (anyone with Docker access on the host) could impersonate other websites to those computers. That's
reasonable for a household server whose Docker access you already control. Don't install the root on
computers someone else manages.

## Notes

- **No HSTS.** Checquery deliberately doesn't send `Strict-Transport-Security`. HSTS covers a whole hostname,
  every port, so browsers would otherwise force HTTPS onto any other plain-HTTP service on the same host (the
  dev server included).
- **Client IPs in the audit Origin.** LAN clients are recorded with their real IP. Requests to `localhost` on
  the Docker host itself show the Docker bridge gateway (e.g. `172.19.0.1`), because Docker's loopback proxy
  sits in the path.
- **Trusted certificates instead.** With a public domain (Let's Encrypt via a DNS-01 challenge) or Tailscale
  `ts.net` names, only the Caddyfile's site address and `tls` line change, and clients need no root
  certificate.
