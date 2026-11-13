# ChatWave AI — MERN starter

ChatWave AI is a React/Vite + Express + MongoDB + Socket.IO messaging starter with Groq-powered AI and WebRTC audio/video-call signaling.

## Authentication flow

New accounts use real SMS verification through **Twilio Verify**:

1. Enter a name and mobile number in E.164 international format, e.g. `+919876543210`.
2. The backend asks Twilio Verify to send an SMS code.
3. The backend verifies the code with Twilio and issues a signed signup ticket valid for 10 minutes.
4. The user sets a password (minimum 10 characters); the backend validates the ticket and saves the verified phone number and bcrypt password hash in MongoDB.
5. Later logins use **mobile number + password**. OTP is not required on every login.

The server never accepts an OTP sent from the browser as proof by itself: Twilio Verify must approve it. OTP endpoints have per-IP rate limits; for multi-instance production deployments, configure a shared rate-limit store and appropriate Twilio Verify service limits.

## 1. Requirements

- Node.js 20+ (Node.js 22 LTS recommended)
- MongoDB Atlas cluster or local MongoDB
- Twilio account and a Twilio Verify service for real SMS OTP
- Groq API key (optional; only AI chat needs it)

## 2. Configure backend

In PowerShell:

```powershell
cd server
Copy-Item .env.example .env
npm install
```

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/chatwave?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters_long
CLIENT_URL=http://localhost:5173
DNS_SERVERS=8.8.8.8,1.1.1.1

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=openai/gpt-oss-120b
```

Never commit `.env` or paste credentials into chat. Use the MongoDB database user's password, not the Atlas website login password. URL-encode reserved characters in the MongoDB URI password. `DNS_SERVERS` is an optional workaround for networks where Node's default SRV DNS resolver is refused; omit it if your network policy requires its own DNS servers.

### Configure Twilio Verify

1. Sign in to [Twilio Console](https://console.twilio.com/).
2. Open **Verify → Services** and create a Verify service.
3. Copy the Account SID, Auth Token, and Verify Service SID into `.env`.
4. Confirm your Twilio account and destination country are allowed to send SMS. Trial accounts may only message verified destination numbers; carrier/country rules and fees can apply.

Do not put Twilio credentials in the React frontend. The backend sends and verifies the code through Twilio Verify.

Start the backend:

```powershell
npm run dev
```

Health check: `http://localhost:5000/api/health`

## 3. Configure frontend

Open a second PowerShell window:

```powershell
cd client
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## 4. Auth API

- `POST /api/auth/otp/start` — `{ "phone": "+919876543210" }`
- `POST /api/auth/otp/check` — `{ "phone": "+919876543210", "code": "123456" }`; returns a short-lived `signupTicket` only after Twilio approves the code.
- `POST /api/auth/register` — `{ "name": "Your Name", "phone": "+919876543210", "password": "10+ characters", "signupTicket": "..." }`
- `POST /api/auth/login` — `{ "phone": "+919876543210", "password": "..." }`

Phone numbers must be in E.164 format with a leading `+` and country code. The app defaults to `+91` for convenience; include the full number.

## Run locally on Windows

1. Install Node.js LTS and MongoDB Community Server, or create a MongoDB Atlas database.
2. Open PowerShell in the project folder.
3. In one terminal:

   ```powershell
   cd server
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

4. Edit `server/.env`: set `MONGODB_URI` to your own database URI and replace `JWT_SECRET` with a random secret of at least 32 characters. For SMS OTP, add your own Twilio Verify credentials. For AI, add your own Groq API key in `GROQ_API_KEY` and keep `AI_PROVIDER=groq`. Never paste API keys into chat or commit them.
5. In a second terminal:

   ```powershell
   cd client
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

6. Open the Vite URL shown in the client terminal (normally `http://localhost:5173`). Check `http://localhost:5000/api/health` to confirm the backend is reachable.

The API now starts even when MongoDB is temporarily unreachable, so `/api/health` can explain the database state instead of the browser showing `ERR_CONNECTION_REFUSED`. Database-backed actions still require a working MongoDB connection.

**Security:** Never commit or share `server/.env`. If credentials were included in a ZIP, screenshot, or repository, revoke/rotate them immediately and replace them with new credentials.

## 5. Deployment

- Backend service root: `server`; install/build command `npm install`; start command `npm start`.
- Frontend root: `client`; build command `npm run build`; output directory `dist`.
- Set all backend environment variables on the backend host. Set `CLIENT_URL` to the exact deployed frontend origin.
- Set frontend `VITE_API_URL` and `VITE_SOCKET_URL` to the HTTPS backend URL.
- Use HTTPS in production. For reliable WebRTC calls across restrictive networks, configure a TURN server; the included STUN-only setup is a prototype.
- Use a shared rate-limit store for multi-instance production deployments and monitor Twilio usage/abuse.

## Scope and limitations

This is a starter, not a fully audited production messaging service. It does not provide end-to-end encryption, robust message read receipts, file-upload storage, or a configured TURN service. Voice/video call behavior must be tested across real devices and networks. Existing accounts from an older email-only schema need a separate phone verification/migration flow before they can use phone login.

## WhatsApp-style feature update (October 2026)

This update adds a set of real, authenticated features to the existing MERN app:

- Message reply quoting (saved with the message), in-chat message search, copy, edit and delete-for-everyone for your own messages.
- Emoji reactions and per-user starred messages.
- Text status posts that expire after 24 hours, status viewing records, and real-time status updates.
- All / Unread / Favorites / Groups chat filters, archive and mute actions, plus a light/dark appearance toggle.
- Improved responsive message action controls and WhatsApp-inspired status/filter styling.
- New server endpoints validate that the signed-in user is a member of the conversation before changing a message.

### Feature limitations to be aware of

This is not yet a complete WhatsApp clone. This update adds functional scheduled text messages, polls with voting, chat events with RSVP responses, block/report endpoints, editable profile/about, basic privacy preferences, chat pinning, disappearing-message timers, and message read-state updates. Scheduled messages are stored in MongoDB and delivered by a lightweight server worker. Disappearing messages are removed when the conversation history is next requested after expiry.

Still requiring implementation and/or provider setup: secure image/video/document uploads and previews; GIF/sticker catalogs; audio recording and playback; production-grade offline push notifications; full group administration/invite links/mentions; image/video status posts and status privacy; call history and group WebRTC calls; true end-to-end encryption, view-once media; 2-step verification; backup/restore and linked devices; location sharing, payments and voice transcription. The attachment control intentionally reports that a storage provider is not configured rather than pretending an upload succeeded. Block/report are basic application controls, not a moderation workflow or legal compliance system.

### Security note

HTTPS and JWT authentication do not provide end-to-end encryption. Do not market this app as end-to-end encrypted until a reviewed cryptographic protocol and key management have been implemented and audited. Configure secrets in `server/.env` using `.env.example`; never commit a real `.env` file.


### Additional ChatWave features (October 2026)

- Schedule and cancel future text messages (within 30 days). Keep the backend running for due messages to be delivered.
- Create polls (2–10 options), vote, and view live vote totals.
- Create chat events and respond Going / Maybe / Can’t go.
- Pin and mute chats, configure disappearing text messages (off, 1 day, 7 days, 90 days), and edit profile/about.
- Basic privacy preferences, block/unblock, report a user, and message read-state updates.
- Chat actions and polls/events are authenticated and check conversation membership.

These additions are starter implementations; test them with a connected MongoDB database before deployment. End-to-end encryption is not implemented.


### Profile photos, attachments, and voice messages
- Profile photos can be changed from the account avatar. JPG, PNG, and WebP images up to 5 MB are accepted.
- Attachments support images, MP4 video, audio, PDF, text, common Office documents, and ZIP files up to 8 MB. Files are stored in `server/uploads` and served from `/uploads`.
- Voice messages use the browser MediaRecorder API; microphone access requires HTTPS or localhost and user permission.
- For production, configure persistent/private object storage (e.g. S3 or Cloudinary), authentication-aware download URLs, malware scanning, quotas, and backup. The included local disk storage is for development/demo use.

## Latest feature pass (October 2026)
- Replaced browser-native prompt/confirm popups in chat actions with branded in-app ChatWave dialogs.
- AI helper now supports translate and rewrite modes in addition to replies and conversation summaries (requires configured `GROQ_API_KEY` or `XAI_API_KEY`).
- Existing project modules include direct chats, group creation, message reply/edit/delete/reactions/starring/forwarding, file and voice-message sharing, status text/photo/video, privacy settings, disappearing-message controls, scheduled messages, polls/events, WebRTC direct calls, and message search.
- Calling requires browser camera/microphone permission and a secure context (localhost/HTTPS). WebRTC STUN-only setup may need TURN configuration for some networks.
- Status and attachments currently use local server disk uploads; this is a demo setup, not production-grade private media storage. Use authenticated object storage, access controls, upload scanning, quotas and backups before public deployment.
- AI features require an API key configured only in `server/.env`; never expose provider keys in the frontend.

## Feature additions in the current update

- Account-wide message text search (`GET /api/search/messages`) scoped to conversations the signed-in user belongs to.
- Account backup export (`GET /api/backup/export`) and up to five MongoDB-hosted backup snapshots (`POST /api/backup`, `GET /api/backup`). Snapshots are capped at 12 MB each.
- Group member add/remove API (`PATCH /api/conversations/:id/members`); group creators/admins can manage members through the chat toolbar.
- Account-persisted theme preference (`navy-blue`, `light`, `midnight`).
- Text-only offline send queue stored in this browser's local storage and sent when Socket.IO reconnects (or when offline queue mode is switched off).
- Emoji category picker plus quick emoji/sticker-style shortcuts.

## Important production limitations

- Audio/video calls use browser WebRTC and a public STUN server. A TURN relay is not configured, so calls may fail on restrictive NATs/mobile networks; use HTTPS and configure TURN for production reliability.
- Offline queue currently queues text messages only, not file uploads, voice notes, or reactions.
- Backup snapshots are stored in the same MongoDB deployment as app data. This is not an independent disaster-recovery backup and does not yet include restore/import tooling or scheduled backups.
- JWT login supports signing in on multiple devices, but there is no server-managed device registry/revocation UI yet.
- Message transport is not end-to-end encrypted. Do not advertise it as such.
- Emoji picker uses platform-rendered emoji and shortcuts; it is not a downloadable animated sticker marketplace.
- Run `npm ci` in both `server` and `client`, configure `.env` from `.env.example`, connect MongoDB, then run the API and Vite client. A full Vite build was not completed in the current environment because dependency installation timed out; source syntax checks were run instead.

## Separate AI chat panel

ChatWave AI now opens as a dedicated conversation view in the main chat workspace rather than a slide-over drawer. The sidebar includes a distinct **ChatWave AI** conversation entry, separate from personal and group chats. AI conversation history is fetched from the authenticated `/api/ai/conversations` endpoints and remains account-backed in MongoDB. Use **New chat** to start a separate AI conversation and the history menu to reopen or delete saved AI threads.

Validation performed for this UI update: server JavaScript syntax check passed, and the React JSX source transpiled without syntax diagnostics. Full Vite production build and live browser testing could not be completed because dependency installation timed out.


## In-app social explorers

- **GitHub Explorer** is available from the left navigation after signing in. It uses GitHub's public REST API to search a username, list public repositories, browse folders/files, and preview README/source text. GitHub's unauthenticated API rate limits apply.
- **Instagram Workspace** is available from the left navigation after signing in. Configure the official Graph API credentials in `server/.env` to view the connected Professional account profile and paginated media feed inside ChatWave. You can enter a public username/profile URL for an in-app embedded preview where Instagram permits it, and public post/Reel URLs can be previewed using Instagram's embed player.

These integrations do not scrape private accounts or bypass platform access controls.

## Instagram account workspace (October 2026)

The Instagram section now has an in-app connected-account profile header, an account media grid, All / Reels & videos / Photos / Carousels filters, cursor-based **Load more** pagination, in-app video playback, and a server-side download route for videos belonging to the connected account. Public usernames/profile URLs open an in-app embedded profile preview where Instagram allows embedding; public post/Reel URLs open an in-app embed. The GitHub and Instagram workspaces use the full main canvas; the chat-list sidebar and chat/AI-chat navigation are hidden while either explorer is open.

### Connect an Instagram account (official OAuth)

ChatWave uses Instagram's official **Instagram Login** OAuth flow. The user enters their Instagram username and password only on Instagram's own authorization page; ChatWave never asks for or stores the Instagram password. After consent, the backend exchanges the authorization code, encrypts the long-lived token with AES-256-GCM, and stores it against the signed-in ChatWave user in MongoDB. OAuth state is stored as a one-time SHA-256 hash in MongoDB with a 10-minute TTL, so the callback survives backend restarts and works across multiple backend instances sharing the same database.

1. In Meta for Developers, create/configure an app with the **Instagram API with Instagram Login** product and the appropriate use case. Use the Instagram App ID and App Secret from that Instagram Login setup; do not substitute an unrelated Facebook App ID.
2. Configure the required Instagram Login permission (the current basic permission is commonly `instagram_business_basic`) and complete any app roles, test-user, business verification, or app-review requirements Meta requires for the account.
3. In `server/.env`, set: 

   ```env
   INSTAGRAM_GRAPH_API_VERSION=v25.0
   INSTAGRAM_APP_ID=YOUR_INSTAGRAM_LOGIN_APP_ID
   INSTAGRAM_APP_SECRET=YOUR_INSTAGRAM_LOGIN_APP_SECRET
   INSTAGRAM_REDIRECT_URI=https://YOUR-BACKEND-NGROK-DOMAIN/api/instagram/oauth/callback
   INSTAGRAM_TOKEN_ENCRYPTION_KEY=64_HEX_CHARACTERS
   ```

   Generate the encryption key with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep it stable: changing it makes previously encrypted tokens unreadable. Never commit or share `.env`.
4. In Meta's Valid OAuth Redirect URIs, add the exact same `INSTAGRAM_REDIRECT_URI` value. It must match exactly, including scheme, host, path, and trailing slash (if any).
5. If the frontend is also exposed through ngrok, set `CLIENT_URL` to that frontend HTTPS URL and add it to the backend CORS origins. The `INSTAGRAM_REDIRECT_URI` always points to the backend tunnel, not the frontend tunnel. Set `VITE_API_URL` and `VITE_SOCKET_URL` to the backend HTTPS tunnel in `client/.env`.
6. Restart the backend and frontend, sign in to ChatWave, open Instagram, and choose **Login with Instagram**. Complete consent on Instagram, then the callback returns to ChatWave.

The Instagram workspace lists account videos and Reels directly; no post URL is required. Each video card has a Download video action. The backend fetches a fresh authorized media URL from Meta and streams the file without buffering the entire video in memory. Configure the streamed download cap with `INSTAGRAM_DOWNLOAD_MAX_MB` (default 500 MB). Meta can omit the downloadable media URL for videos affected by licensed audio or other rights restrictions.

The backend refreshes a long-lived token when it approaches expiry (provided Meta still considers it refreshable). If Instagram revokes access, the token expires, the app secret/key changes, or permissions are removed, use **Connect / Switch account** to authorize again. **Disconnect** removes the encrypted local token record.

### Instagram API limitations

Meta does not provide a supported API that lets a third-party app reproduce every Instagram feature or enumerate every arbitrary user's profile/feed by username. This integration can show the profile and media made available by the authorized connected account. Public post/Reel links can still be previewed with Instagram's official embed when embedding is permitted. It does not bypass private-account restrictions, download other creators' media, or implement Instagram DMs, follow/unfollow, likes, comments, Stories publishing, or account-management actions. Those capabilities require separate Meta permissions/products and some are not available to third-party apps at all.


## Instagram Login (OAuth) setup

ChatWave does not collect Instagram passwords. The **Login with Instagram** button redirects users to Instagram's own authorization screen and returns to ChatWave after consent. This official Instagram Login flow is for Instagram Professional (Business or Creator) accounts; it does not provide login to arbitrary personal/private accounts or access to another person's account.

1. Create/configure an app in Meta for Developers. In the app dashboard, complete **Instagram → API setup with Instagram Login / Business Login**. Merely adding the generic Instagram product is not enough to enable this OAuth flow.
2. In that Instagram Login setup screen, copy the **Instagram App ID and Instagram App Secret**. Do not copy the Facebook/Meta App ID from App Settings → Basic; using the wrong ID commonly causes Meta's `Invalid platform app` response.
3. Add the exact callback URI shown in `INSTAGRAM_REDIRECT_URI` to **Instagram → API setup with Instagram Login → Business login settings → OAuth redirect URIs**. For ngrok/local development use the backend's public HTTPS tunnel, not `localhost`, and keep the URL identical character-for-character in Meta and `server/.env`.
4. Set `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` and `INSTAGRAM_REDIRECT_URI` in `server/.env`.
5. Generate a 32-byte random encryption key and set its 64-character hex value as `INSTAGRAM_TOKEN_ENCRYPTION_KEY`. Example PowerShell: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
5. Restart the backend, sign in to ChatWave, open Instagram Explorer, and choose **Login with Instagram**.
6. Request only the Meta permissions your app has configured and been approved for. Meta may require app review / business verification before non-role users can connect.

Access tokens are stored encrypted in MongoDB per ChatWave user. OAuth state is one-time, hashed, database-backed, and expires after 10 minutes. The backend refreshes long-lived tokens as they approach expiry when Meta still permits refresh. Disconnecting removes the stored connection; revoked or expired access requires a fresh official login. The app never asks users to enter their Instagram password into ChatWave.


## URL Media Viewer (November 2026)

The left navigation includes **URL Media Viewer**. Paste a direct HTTP(S) URL to preview images, video, audio, PDF, text, and Office documents in ChatWave. The viewer includes an Open original action and a browser download action. Download behavior depends on the source host and browser cross-origin rules; the app does not bypass authentication, private content, DRM, or site restrictions. For sites that block embeds, use Open original. No remote-download proxy is enabled, avoiding unsafe server-side URL fetching.

The Instagram workspace is account-based: connect an Instagram Professional account through official OAuth, browse the connected account's videos/Reels inside ChatWave, and use the Download video action without pasting any Instagram post URL. Downloads request a fresh media URL from Meta on the backend and stream the video to the browser; the server does not store a permanent copy. Set `INSTAGRAM_DOWNLOAD_MAX_MB` to change the default 500 MB streaming limit. Meta may omit `media_url` for videos with licensed/copyrighted audio or other rights restrictions; ChatWave shows an explanatory error instead of saving a thumbnail or HTML error page. The separate URL Media Viewer remains a different feature. Existing chat, calling, GitHub, and account features remain in place.

## Running behind ngrok (Instagram OAuth / mobile browser testing)

When the frontend is opened through ngrok, point the frontend API and Socket.IO URLs at the public **backend** ngrok HTTPS origin. For example:

```env
# client/.env (replace with your actual backend tunnel)
VITE_API_URL=https://YOUR-BACKEND-TUNNEL.ngrok-free.app
VITE_SOCKET_URL=https://YOUR-BACKEND-TUNNEL.ngrok-free.app

# server/.env
CLIENT_URL=https://YOUR-FRONTEND-TUNNEL.ngrok-free.app
INSTAGRAM_GRAPH_API_VERSION=v25.0
INSTAGRAM_APP_ID=YOUR_INSTAGRAM_APP_ID
INSTAGRAM_APP_SECRET=YOUR_INSTAGRAM_APP_SECRET
INSTAGRAM_REDIRECT_URI=https://YOUR-BACKEND-TUNNEL.ngrok-free.app/api/instagram/oauth/callback
INSTAGRAM_TOKEN_ENCRYPTION_KEY=64_HEX_CHARACTERS
```

Use the same exact callback URL in the Meta Developer Dashboard's Instagram API / Instagram Login OAuth redirect allow-list. The `INSTAGRAM_APP_ID` must be the **Instagram App ID shown in the Instagram API with Instagram Login setup**, not an unrelated Facebook/Meta app identifier. The app must have Instagram API with Instagram Login configured, the requested `instagram_business_basic` permission, and the account/app roles or review access required by Meta. The `Invalid platform app` response is returned by Meta before ChatWave receives the callback; changing React or ngrok code cannot repair an incorrect Meta app/product/App ID configuration.

Restart the Vite client after changing `client/.env` and restart the Node server after changing `server/.env`. Never commit real `.env` files or expose the App Secret / token-encryption key.

The URL downloader supports direct public media/file URLs (up to 100 MB by default (configurable with `MEDIA_DOWNLOAD_MAX_MB`)) and intentionally rejects private-network URLs, login-protected pages, DRM, and source-site restrictions. It is not a general Instagram/TikTok page scraper. If Meta still displays `Invalid platform app` before the user can consent, the app ID/product configuration is not accepted by Meta: verify the Instagram-specific App ID, complete the Instagram Login setup, and ensure the callback is saved in the Instagram Business Login settings. ChatWave cannot override Meta's app validation.

## November 2026 reliability updates

- Instagram media pagination now returns both `paging.next` and `paging.hasNext`, matching the frontend's load-more control.
- Voice-message preview is retained if upload or socket delivery fails; the draft is cleared only after the server acknowledges the message.
- URL Viewer now offers a download attempt for page URLs too, so the backend can identify the actual response type. HTML pages are rejected with a clear explanation instead of being treated as media files.
- Public Instagram post/Reel embeds depend on Instagram's embed availability and account privacy settings. The official Instagram Login API does not provide arbitrary public-Reel downloading; downloads are limited to media returned for the connected account.

Before testing Instagram OAuth, make sure the Instagram Login product is configured in Meta for Developers, and that the Instagram App ID, App Secret, redirect URI, and scopes belong to that same app configuration. A Meta-side `Invalid platform app` response cannot be corrected by changing the frontend alone.

## Public Instagram URL downloads (no Instagram account connection)

Open **Media** in ChatWave and paste a public Instagram Reel/post URL or a direct public video-file URL. The URL preview's **Download video** action uses the authenticated ChatWave server endpoint `/api/media/download`; it does not call the Instagram-account OAuth endpoint and does not require connecting an Instagram account.

The server can download direct public media URLs and public webpages that expose a direct video URL through Open Graph metadata. Instagram may not expose the underlying video file for every public Reel, and may return a login wall, rate limit, or restricted page. In those cases ChatWave reports that the media is unavailable rather than bypassing Instagram's access controls. Private/login-protected posts, DRM, HLS/DASH playlists, and arbitrary public Reels that do not expose a public media URL cannot be downloaded through this generic URL flow. The user still needs to be signed in to ChatWave itself.

## Resume Library, group wizard and status media update (November 2026)
- Resume Library is available from the left app rail. Upload PDF/DOC/DOCX files up to 8 MB, organize them by role category, open saved files, and remove entries. Resume metadata is private to the signed-in ChatWave account in MongoDB.
- Group creation now uses a two-step WhatsApp-style wizard: searchable contact selection, group name, optional description and member count.
- Status media URLs are stored as relative `/uploads/...` paths and resolved against `VITE_API_URL`, avoiding uploader-localhost links when another account/device views the status.
