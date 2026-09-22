# Zing Sync Backend Contract — protocol v1

The frontend is local-first. The backend stores and returns a canonical `SyncBundle`.

## Endpoints

### `GET /api/sync/bundle`
Returns the current canonical `SyncBundle` as JSON.

### `PUT /api/sync/bundle`
Accepts a complete merged `SyncBundle` as JSON.
Return `204 No Content`, or return the canonical `SyncBundle` as JSON.

## SyncBundle

```ts
{
  protocolVersion: 1,
  exportedAt: string,
  deviceId: string,
  records: Array<{
    entityType: 'task' | 'journal' | 'mood' | 'tag' | 'anniversary',
    entityId: string,
    updatedAt: string,
    payload: unknown
  }>,
  tombstones: Array<{
    key: string,
    entityType: 'task' | 'journal' | 'mood' | 'tag' | 'anniversary',
    entityId: string,
    deletedAt: string,
    deviceId: string
  }>
}
```

## Security
Do not embed GitHub tokens or server secrets in the browser bundle.
Authentication belongs at the server/session/deployment boundary.

## Attachments
Binary attachment transport is intentionally not part of protocol v1 yet.
Metadata remains in Journal/Task payloads. Attachment upload/download will get a
separate content-addressed endpoint so large images/audio do not force full JSON
bundle transfers.
