# Delegation Guide

## Concepts

A **delegation** is a cryptographic proof that grants an agent specific abilities on a specific Storacha Space. Delegations are created by Space owners and distributed to agents.

## Creating Delegations

### Via CLI

```bash
storacha delegation create \
  -c space/blob/add -c space/index/add -c upload/add \
  <AGENT_DID> --base64
```

### Via Policy File

Create a JSON policy file:

```json
{
  "agents": {
    "research-agent": {
      "did": "did:key:z6Mk...",
      "domains": {
        "market-data": {
          "abilities": ["space/blob/list", "upload/list"],
          "expiration_hours": 24
        }
      }
    },
    "ingestion-agent": {
      "did": "did:key:z6Mk...",
      "domains": {
        "market-data": {
          "abilities": ["space/blob/add", "upload/add", "space/blob/list"],
          "expiration_hours": 1
        }
      }
    }
  }
}
```

Then run:

```bash
npm run generate-delegations -- policy.json
```

## Abilities Reference

| Ability | Description | Use case |
|---------|-------------|----------|
| `space/blob/list` | List blobs in a Space | Read access |
| `upload/list` | List uploads | Read access |
| `space/blob/add` | Add blobs to a Space | Write access |
| `upload/add` | Register uploads | Write access |
| `space/index/add` | Add to Space index | Write access |
| `filecoin/offer` | Create Filecoin deals | Archival |

## Expiration

All delegations include an expiration timestamp. Recommended defaults:
- Read delegations: 24 hours
- Write delegations: 1 hour

Expired delegations are automatically rejected. No revocation message needed.

## Revocation

To immediately cut off access before expiration:

```typescript
delegationManager.revoke(agentDid, domain);
```

Revocations take effect immediately on the next request.
