# Tadbeer Mongo Seed Data

This folder contains sample MongoDB data matched to the server models in `server/src/models`.

## Fastest restore

From this folder, run:

```powershell
mongosh "mongodb://127.0.0.1:27017/tadbeer" .\seed.mongo.js
```

Change `tadbeer` in the connection string if your `.env` uses a different database name.

The script clears and reloads these collections:

- `users`
- `Departments`
- `Tickets`
- `comments`
- `Notifications`

## Demo logins

All accounts use:

```text
Password123
```

Useful emails:

```text
admin@tadbeer.local
it.manager@tadbeer.local
security.manager@tadbeer.local
billing.manager@tadbeer.local
it.agent@tadbeer.local
security.agent@tadbeer.local
sara.user@tadbeer.local
khaled.user@tadbeer.local
```

## MongoDB Compass

If you use Compass, import the JSON files into the exact collection names shown above. The collection names matter because some Mongoose models in this project use custom capitalized collection names.
