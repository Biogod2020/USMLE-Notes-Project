---
description: Build and Deploy to TestFlight
---

# Deploy to TestFlight

Follow this checklist to build your iOS app and upload it to App Store Connect for TestFlight testing.

## Prerequisites
- Apple Developer Account ($99/year)
- App Store Connect app record created for `com.jiahaoji.usmle-knowledge-engine`
- Xcode installed and signed in

## 1. Configure Versioning
Ensure your `src-tauri/tauri.conf.json` has a new version number for each upload.
```json
// src-tauri/tauri.conf.json
{
  "version": "1.0.1", // Increment this!
  // ...
}
```

## 2. Build the iOS App
Run the build command to generate the Xcode archive.
```bash
npm run tauri ios build
```
*Note: This might take a few minutes.*

## 3. Upload via Xcode
1.  When the build finishes, Xcode should open automatically. If not, open `src-tauri/gen/apple/USMLE Knowledge Engine.xcodeproj`.
2.  In Xcode, go to **Product > Archive**.
3.  Wait for the archiving process to complete. The "Organizer" window will appear.
4.  Select your latest archive and click **Distribute App**.
5.  Select **TestFlight & App Store** -> **Distribute**.
6.  Xcode will validate and upload your app.

## 4. Enable TestFlight
1.  Go to [App Store Connect](https://appstoreconnect.apple.com/).
2.  Select your app -> **TestFlight** tab.
3.  Wait for the build to finish "Processing" (usually 10-20 mins).
4.  Once "Missing Compliance" appears, click "Manage", answer "No" (unless you use encryption), and "Start Internal Testing".
5.  Add yourself or others to "App Store Connect Users" to send email invites.

## Troubleshooting
- **Signing Errors**: Check "Signing & Capabilities" in Xcode project settings. Ensure "Automatically manage signing" is checked and your Team is selected.
- **Version Conflict**: You cannot upload the same version twice. Increment `version` in `tauri.conf.json` or `Bundle Version` in Xcode.
