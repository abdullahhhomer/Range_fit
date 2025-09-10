# Firebase Functions Deployment Guide (Spark Plan Compatible)

## What Changed

✅ **Converted from Firebase Functions v2 to v1** - Now compatible with Spark (free) plan
✅ **Updated package.json** - Using Firebase Functions v4.8.1 and Node.js 18
✅ **Fixed function signatures** - Updated to v1 API format

## Functions Included

1. **deleteUserAccount** - Complete user deletion (Auth + Firestore + anonymized payments)
2. **checkMembershipStatus** - Hourly membership expiry checks
3. **manualMembershipCheck** - Daily membership status verification
4. **archivePaymentRecords** - Daily payment archival (2 AM)
5. **cleanupOldArchivedRecords** - Monthly cleanup of old records

## Deployment Steps

### 1. Install Dependencies
```bash
cd functions
npm install
```

### 2. Build Functions
```bash
npm run build
```

### 3. Deploy to Firebase
```bash
npm run deploy
```

### 4. Verify Deployment
```bash
firebase functions:list
```

## Important Notes

⚠️ **Timezone Limitation**: v1 scheduled functions don't support custom timezones
- Functions will run in UTC timezone
- Adjust your schedules accordingly:
  - `"0 2 * * *"` = 2 AM UTC (7 AM Pakistan time)
  - `"0 3 1 * *"` = 3 AM UTC on 1st of month (8 AM Pakistan time)

## Cost Information

✅ **Free Tier Limits** (Spark Plan):
- 125K invocations/month
- 40K GB-seconds compute time/month
- 5GB outbound networking/month

Your functions should stay well within these limits for a gym management system.

## Monitoring

Check function logs:
```bash
firebase functions:log
```

Monitor usage in Firebase Console:
- Go to Functions tab
- Check "Usage" section
- Monitor "Invocations" and "Compute time"
