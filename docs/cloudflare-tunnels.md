# Cloudflare Access Tunnels Integration

The goal of this integration is to allow users to securely access the Web Dashboard and Orchestration Engine from external networks without exposing local network access directly to the internet.

## Quick Tunnels for Rapid Prototyping

For immediate, ephemeral access during development, a Quick Tunnel can be spawned via the local helper script:

```bash
cd apps/proxy
npm run tunnel
```

This will spawn an isolated `cloudflared` process that binds to the Web Dashboard (running on port `3000`) and outputs a randomized `.trycloudflare.com` URL (e.g., `https://random-words.trycloudflare.com`).

**Security Note:** Quick Tunnels only have security-by-obscurity (the random subdomain). They do not enforce zero-trust authentication checks. They must be used strictly for rapid prototyping or testing, and should be shut down when not actively needed.

## Persistent Tunnels & Zero-Trust Access

For secure, ongoing external access, a persistent Cloudflare Tunnel wrapped in Cloudflare Access Policies is required. This enforces Zero-Trust authentication *at the edge*, before any traffic hits your machine's `cloudflared` daemon.

### Recommended Setup

1. **Authenticate `cloudflared`** to your Cloudflare account:
   ```bash
   npx cloudflared tunnel login
   ```
2. **Create the persistent tunnel**:
   ```bash
   npx cloudflared tunnel create local-dashboard
   ```
3. **Route the tunnel** to your domain:
   ```bash
   npx cloudflared tunnel route dns local-dashboard dashboard.yourdomain.com
   ```
4. **Configure Zero Trust Access**:
   Navigate to your Cloudflare Zero Trust Dashboard, go to **Access > Applications**, and secure `dashboard.yourdomain.com`.

### Baseline Policy Recommendations

- **Identity Provisioning:** Restrict access using explicit Allow Rules based on `Emails` (e.g., your personal developer email) or `IdP Groups` (e.g., GitHub organization teams or Google Workspace).
- **Session Duration:** Enforce short-lived authentication sessions (e.g., 2–12 hours) to avoid stale, lingering access.
- **WAF Rules:** (Optional) If you have a WAF active on that zone, ensure standard rule-sets exist to mitigate brute-force probing, even though Access serves as the primary gateway.

By utilizing Cloudflare Access, bad actors must present a valid strong identity (OAuth/SSO/OTP) before packets are allowed to physically route back down the encrypted TCP connection to your local `.agent` CLI orchestration system.
