---
topics: [api, authentication, 401, unauthorized, bearer, token]
---

# API Authentication: Troubleshooting 401 Errors

## Quick Fix
> **90% of 401 errors** are caused by one of these:
> 1. Missing `Bearer ` prefix in Authorization header
> 2. Expired or revoked API token
> 3. Token lacks required scopes/permissions

## Correct Request Format

### Valid Request
```bash
curl https://api.example.com/v1/users \
  -H "Authorization: Bearer sk_live_abc123..." \
  -H "Content-Type: application/json"

### Common Mistakes
# Missing "Bearer " prefix
curl -H "Authorization: sk_live_abc123..."  # Wrong

# Extra spaces
curl -H "Authorization: Bearer  sk_live..."  # Two spaces

# Using query param instead of header
curl "https://api.example.com/v1/users?token=sk_live..."  # Not supported

### Token Validation Steps
1. Check token format: Should start with sk_live_ or sk_test_
2. Verify token is active:
    ```bash
        12
        curl https://api.example.com/v1/auth/verify \ -H "Authorization: Bearer YOUR_TOKEN"```

    - 200 OK → Token is valid
    - 401 Unauthorized → Token is invalid/expired
    - 403 Forbidden → Token lacks required scopes

3. Check token scopes:
    - users:read → Required for /v1/users
    - users:write → Required for POST/PUT to /v1/users

3. Regenerate a Token
    If your token is expired or revoked:
    - Log into the dashboard: https://app.example.com
    - Navigate to Settings → API Keys
    - Click "Revoke" on the old key
    - Click "Generate New Key"
    - Copy and store securely (cannot be viewed again)
