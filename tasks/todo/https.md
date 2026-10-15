# HTTPS for the web app

Follow-up from the web-app conversion (`tasks/done/convert-to-web-app-implementation-plan.md`, D5.3 and §11).

The server speaks plain HTTP. Login and file passwords therefore cross the network unencrypted for anything
other than localhost, and `docker-compose.yml` binds to 127.0.0.1 by default for that reason.

* Serve HTTPS: either TLS in the container (`Bun.serve({ tls })` with mounted certificate files), or a
  documented reverse-proxy setup (Caddy/Traefik/nginx) with `CHECQUERY_TRUST_PROXY=true`. Decide which.
* Add `Secure` to the `checquery_session` cookie when served over HTTPS.
* With a secure context, the inline calculator's copy-to-clipboard also starts working off-localhost.
