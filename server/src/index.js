import "dotenv/config";
import dns from "node:dns";
import net from "node:net";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import express from "express";
import http from "http";
import cors from "cors";
import bcrypt from "bcryptjs";
import twilio from "twilio";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import OpenAI from "openai";
import { User, Message, Conversation, Status, Poll, ChatEvent, UserReport, AIConversation, ChatBackup, InstagramConnection, InstagramOAuthState, Resume, LinkedInLink } from "./models.js";
import { requireAuth, signToken } from "./auth.js";
import { parseLinkedInUrl } from "./linkedin.js";

// Some Windows/managed networks block the default DNS resolver used by Node's SRV lookup.
// Override only when DNS_SERVERS is configured; set DNS_SERVERS=8.8.8.8,1.1.1.1 if needed.
if (process.env.DNS_SERVERS) {
  const servers = process.env.DNS_SERVERS.split(",").map(v => v.trim()).filter(Boolean);
  if (servers.length) dns.setServers(servers);
}

const app = express();
// Honor ngrok / reverse-proxy HTTPS headers so generated upload URLs stay HTTPS.
app.set("trust proxy", 1);
const server = http.createServer(app);
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json({ limit: "12mb" }));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, "../uploads");
await fs.mkdir(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir, { maxAge: "1d", setHeaders(res) { res.setHeader("X-Content-Type-Options", "nosniff"); } }));
const uploadMimeExt = new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"],["image/gif","gif"],["application/pdf","pdf"],["text/plain","txt"],["application/zip","zip"],["application/msword","doc"],["application/vnd.openxmlformats-officedocument.wordprocessingml.document","docx"],["application/vnd.ms-excel","xls"],["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","xlsx"],["video/mp4","mp4"],["video/webm","webm"],["audio/webm","weba"],["audio/ogg","ogg"],["audio/mpeg","mp3"],["audio/mp4","m4a"],["audio/wav","wav"]]);
async function saveDataUrl(dataUrl, originalName, allowedMimes) {
  if (typeof dataUrl !== "string") throw Object.assign(new Error("Choose a file to upload."), { statusCode: 400 });
  const match = dataUrl.match(/^data:([\w.+-]+\/[\w.+-]+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw Object.assign(new Error("Invalid file data."), { statusCode: 400 });
  const mime = match[1].toLowerCase(); const ext = uploadMimeExt.get(mime);
  if (!ext || (allowedMimes && !allowedMimes.includes(mime))) throw Object.assign(new Error("This file type is not supported."), { statusCode: 415 });
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) throw Object.assign(new Error("Files must be smaller than 8 MB."), { statusCode: 413 });
  const safeExt = `.${ext}`;
  const name = `${crypto.randomUUID()}${safeExt.toLowerCase()}`;
  await fs.writeFile(path.join(uploadDir, name), buffer, { flag: "wx" });
  return { url: `/uploads/${name}`, mimeType: mime, fileName: String(originalName || `file.${ext}`).replace(/[\\/\0-\r\n]/g, "_").slice(0, 180), fileSize: buffer.length };
}

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

const asyncHandler = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);


// Authenticated direct-media downloader. Only public HTTP(S) hosts are allowed;
// redirects are revalidated to prevent SSRF against localhost/private networks.
function isPrivateAddress(address) {
  if (net.isIP(address) === 4) {
    const [a,b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const value = address.toLowerCase();
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:") || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
}
async function validatePublicUrl(value) {
  let url; try { url = new URL(value); } catch { throw Object.assign(new Error("Enter a valid media URL."), { statusCode: 400 }); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !["", "80", "443"].includes(url.port)) throw Object.assign(new Error("Only public HTTP/HTTPS media URLs are supported."), { statusCode: 400 });
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw Object.assign(new Error("Private network URLs cannot be downloaded."), { statusCode: 400 });
  let addresses;
  if (net.isIP(host)) addresses = [{ address: host }];
  else { try { addresses = await dns.promises.lookup(host, { all: true, verbatim: true }); } catch { throw Object.assign(new Error("The media host could not be resolved."), { statusCode: 400 }); } }
  if (!addresses.length || addresses.some(item => isPrivateAddress(item.address))) throw Object.assign(new Error("Private network URLs cannot be downloaded."), { statusCode: 400 });
  return url;
}
const MEDIA_MAX_BYTES = Math.max(1, Number(process.env.MEDIA_DOWNLOAD_MAX_MB || 100)) * 1024 * 1024;
const MEDIA_REDIRECTS = 6;
const MEDIA_UA = "Mozilla/5.0 (compatible; ChatWaveMedia/1.0; +https://chatwave.app)";
const MEDIA_ACCEPT = "video/*,audio/*,image/*,application/pdf,application/zip,text/plain,text/csv,text/html,application/xhtml+xml;q=0.8,*/*;q=0.5";
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);
async function fetchPublicFollowingRedirects(input, { accept = MEDIA_ACCEPT, referer } = {}) {
  let target = await validatePublicUrl(String(input));
  for (let hop = 0; hop <= MEDIA_REDIRECTS; hop++) {
    const headers = { "User-Agent": MEDIA_UA, Accept: accept };
    if (referer) headers.Referer = referer;
    const response = await fetch(target, { redirect: "manual", signal: AbortSignal.timeout(45000), headers });
    if (!REDIRECT_CODES.has(response.status)) return { response, target };
    const location = response.headers.get("location");
    if (!location || hop === MEDIA_REDIRECTS) throw Object.assign(new Error("The source redirected too many times or returned an invalid redirect."), { statusCode: 502 });
    target = await validatePublicUrl(new URL(location, target).toString());
  }
  throw Object.assign(new Error("Could not resolve the media download URL."), { statusCode: 502 });
}
async function readLimitedBody(body, limit, tooLargeMessage) {
  const chunks = []; let total = 0;
  for await (const chunk of body) {
    total += chunk.length;
    if (total > limit) throw Object.assign(new Error(tooLargeMessage), { statusCode: 413 });
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
function extractPublicVideoCandidates(html) {
  const candidates = [];
  // Parse meta tags independent of attribute order and quote style.
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    const key = (attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
    if (["og:video", "og:video:url", "og:video:secure_url", "twitter:player:stream", "og:audio"].includes(key) && attrs.content) candidates.push(attrs.content);
  }
  // Public Instagram pages sometimes include a direct video URL in embedded JSON
  // even when they omit Open Graph video tags. Only consume URLs exposed in the
  // anonymous HTML response; every candidate is still revalidated before fetch.
  for (const match of html.matchAll(/(?:\\?"(?:video_url|videoUrl|contentUrl)\\?"\s*:\s*)\\?"(https?:[^\\"]+)\\?"/gi)) {
    const decoded = match[1].replace(/\\u0026/gi, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&");
    if (/\.(?:mp4|webm)(?:[?#]|$)/i.test(decoded) || /cdninstagram\.com|fbcdn\.net/i.test(decoded)) candidates.push(decoded);
  }
  return [...new Set(candidates)];
}
function mediaExtension(type, url, disposition = "") {
  const fromDisposition = disposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i)?.[1];
  const candidate = fromDisposition || new URL(url).pathname.split("/").pop() || "";
  const ext = candidate.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase();
  const known = { "video/mp4":"mp4", "video/webm":"webm", "video/quicktime":"mov", "video/x-matroska":"mkv", "audio/mpeg":"mp3", "audio/mp4":"m4a", "audio/ogg":"ogg", "audio/wav":"wav", "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/gif":"gif", "image/avif":"avif", "application/pdf":"pdf", "application/zip":"zip", "text/plain":"txt", "text/csv":"csv" };
  return known[type] || (ext && /^[a-z0-9]{1,8}$/.test(ext) ? ext : "bin");
}
app.get("/api/media/download", requireAuth, asyncHandler(async (req, res) => {
  const rawUrl = String(req.query.url || "").trim();
  if (!rawUrl) throw Object.assign(new Error("Paste a URL first."), { statusCode: 400 });
  let { response: remote, target } = await fetchPublicFollowingRedirects(rawUrl);
  if (!remote.ok || !remote.body) throw Object.assign(new Error(`The source refused the download (${remote.status}). It may require a signed-in session or block server requests.`), { statusCode: 502 });
  let type = (remote.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
  if (type === "text/html" || type === "application/xhtml+xml") {
    const page = await readLimitedBody(remote.body, 5 * 1024 * 1024, "The source page is too large to inspect.");
    const html = page.toString("utf8");
    const host = new URL(target).hostname.toLowerCase();
    if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)tiktok\.com$/.test(host)) {
      throw Object.assign(new Error("This platform does not provide a downloadable public video file through its webpage URL. Use the platform's official download/export option or paste a direct media-file URL you are authorized to download."), { statusCode: 415 });
    }
    const candidates = extractPublicVideoCandidates(html);
    if (!candidates.length) throw Object.assign(new Error("This webpage does not expose a public media file. Direct MP4/WebM links and pages with public Open Graph video metadata are supported; login-protected or restricted media cannot be fetched."), { statusCode: 415 });
    let mediaResult = null;
    for (const candidate of candidates) {
      try {
        const absolute = new URL(candidate.replace(/&amp;/g, "&"), target).toString();
        const result = await fetchPublicFollowingRedirects(absolute, { accept: "video/*,audio/*,image/*,*/*;q=0.5", referer: target });
        if (result.response.ok && result.response.body) { mediaResult = result; break; }
      } catch { /* try next public metadata candidate */ }
    }
    if (!mediaResult) throw Object.assign(new Error("The page listed media, but its CDN URL was unavailable. It may be expired, region-restricted, or require cookies."), { statusCode: 502 });
    remote = mediaResult.response; target = mediaResult.target;
    type = (remote.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
  }
  const allowed = /^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|webm|quicktime|x-matroska)|audio\/(mpeg|mp4|wav|ogg|webm)|application\/(pdf|zip|octet-stream)|text\/(plain|csv))$/;
  if (!allowed.test(type)) throw Object.assign(new Error(`The URL returned ${type || "an unknown file type"}, not a supported downloadable media file. HLS/DASH playlists and webpage HTML are not direct video files.`), { statusCode: 415 });
  const declared = Number(remote.headers.get("content-length") || 0);
  if (declared > MEDIA_MAX_BYTES) throw Object.assign(new Error(`Downloads are limited to ${Math.round(MEDIA_MAX_BYTES / 1024 / 1024)} MB.`), { statusCode: 413 });
  const buffer = await readLimitedBody(remote.body, MEDIA_MAX_BYTES, `Downloads are limited to ${Math.round(MEDIA_MAX_BYTES / 1024 / 1024)} MB.`);
  if (!buffer.length) throw Object.assign(new Error("The source returned an empty file."), { statusCode: 502 });
  // Refuse common HTML/XML error pages mislabelled as binary content.
  const head = buffer.subarray(0, 256).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<!doctype html") || head.startsWith("<html") || head.startsWith("<?xml")) throw Object.assign(new Error("The media host returned an error webpage instead of the video file. The link may have expired or require a browser session."), { statusCode: 415 });
  const ext = mediaExtension(type, target, remote.headers.get("content-disposition") || "");
  const name = `chatwave-download-${Date.now()}.${ext}`;
  res.setHeader("Content-Type", type); res.setHeader("Content-Length", buffer.length);
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  res.send(buffer);
}));

// Instagram Login (OAuth). Passwords are entered only on Instagram/Meta's own authorization page.
// Tokens are encrypted at rest and scoped to the signed-in ChatWave user.
const instagramGraphVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v25.0";
function instagramEncryptionKey() {
  const raw = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(raw)) throw Object.assign(new Error("Set INSTAGRAM_TOKEN_ENCRYPTION_KEY to 64 hexadecimal characters in server/.env."), { statusCode: 503 });
  return Buffer.from(raw, "hex");
}
function encryptInstagramToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", instagramEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return { tokenCiphertext: ciphertext.toString("base64"), tokenIv: iv.toString("base64"), tokenAuthTag: cipher.getAuthTag().toString("base64") };
}
function decryptInstagramToken(connection) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", instagramEncryptionKey(), Buffer.from(connection.tokenIv, "base64"));
  decipher.setAuthTag(Buffer.from(connection.tokenAuthTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(connection.tokenCiphertext, "base64")), decipher.final()]).toString("utf8");
}
async function getInstagramConnection(userId) {
  return InstagramConnection.findOne({ owner: userId });
}
async function refreshInstagramConnection(connection) {
  if (!connection) return null;
  // Long-lived Instagram tokens can be refreshed after 24 hours and before expiry.
  if (!connection.expiresAt || connection.expiresAt.getTime() > Date.now() + 7 * 24 * 60 * 60 * 1000) return connection;
  if (connection.expiresAt.getTime() <= Date.now()) throw Object.assign(new Error("Your Instagram session has expired. Reconnect your account."), { statusCode: 401 });
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", decryptInstagramToken(connection));
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw Object.assign(new Error(data.error?.message || "Instagram could not refresh this session. Please reconnect."), { statusCode: 401 });
  const encrypted = encryptInstagramToken(data.access_token);
  connection.set({ ...encrypted, expiresAt: data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000) : connection.expiresAt });
  await connection.save();
  return connection;
}
async function instagramUserGraphRequest(connection, path, params = {}) {
  if (!connection) throw Object.assign(new Error("Connect your Instagram Professional account first."), { statusCode: 503 });
  connection = await refreshInstagramConnection(connection);
  const token = decryptInstagramToken(connection);
  const url = new URL(`https://graph.instagram.com/${instagramGraphVersion}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw Object.assign(new Error(data.error?.message || `Instagram API request failed (${response.status}).`), { statusCode: response.status === 401 || response.status === 403 ? 502 : response.status || 502 });
  return data;
}
app.get("/api/instagram/oauth/start", requireAuth, asyncHandler(async (req, res) => {
  const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || process.env.INSTAGRAM_CLIENT_ID;
  const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI;
  if (!INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET || !INSTAGRAM_REDIRECT_URI) throw Object.assign(new Error("Configure the Instagram-specific App ID, Instagram App Secret and exact HTTPS callback URL in server/.env. Do not use the Facebook App ID from App Settings → Basic."), { statusCode: 503 });
  let callbackUrl; try { callbackUrl = new URL(INSTAGRAM_REDIRECT_URI); } catch { throw Object.assign(new Error("INSTAGRAM_REDIRECT_URI must be a valid absolute URL."), { statusCode: 503 }); }
  if (callbackUrl.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(callbackUrl.hostname)) throw Object.assign(new Error("Instagram OAuth requires an HTTPS callback URL. Use your backend ngrok HTTPS URL."), { statusCode: 503 });
  instagramEncryptionKey();
  const state = crypto.randomBytes(32).toString("hex");
  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  await InstagramOAuthState.create({ stateHash, owner: req.user._id, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", INSTAGRAM_APP_ID);
  authUrl.searchParams.set("redirect_uri", INSTAGRAM_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "instagram_business_basic");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("enable_fb_login", "0");
  res.json({ url: authUrl.toString() });
}));
app.get("/api/instagram/oauth/callback", asyncHandler(async (req, res) => {
  const state = String(req.query.state || "");
  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  const pending = state ? await InstagramOAuthState.findOneAndDelete({ stateHash, expiresAt: { $gt: new Date() } }) : null;
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim();
  const fail = (message) => res.redirect(`${clientUrl}/?instagram_error=${encodeURIComponent(String(message).slice(0, 240))}`);
  if (!pending) return fail("Instagram login session expired or invalid. Please try again.");
  if (req.query.error) return fail(String(req.query.error_description || req.query.error).slice(0, 240));
  const code = String(req.query.code || "");
  if (!code) return fail("Instagram did not return an authorization code.");
  const form = new URLSearchParams({ client_id: process.env.INSTAGRAM_APP_ID || process.env.INSTAGRAM_CLIENT_ID || "", client_secret: process.env.INSTAGRAM_APP_SECRET || "", grant_type: "authorization_code", redirect_uri: process.env.INSTAGRAM_REDIRECT_URI || "", code });
  const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  const tokenData = await tokenResponse.json().catch(() => ({}));
  const shortLivedToken = tokenData.access_token || tokenData.data?.[0]?.access_token;
  if (!tokenResponse.ok || !shortLivedToken) return fail(tokenData.error_message || tokenData.error?.message || "Instagram did not return an access token. Check that the Instagram-specific App ID/Secret and redirect URI belong to the same Instagram Login configuration.");
  const longUrl = new URL("https://graph.instagram.com/access_token");
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", process.env.INSTAGRAM_APP_SECRET || "");
  longUrl.searchParams.set("access_token", shortLivedToken);
  const longResponse = await fetch(longUrl);
  const longData = await longResponse.json().catch(() => ({}));
  if (!longResponse.ok || !longData.access_token) return fail(longData.error?.message || "Could not exchange the Instagram token for a long-lived token. Please try login again.");
  const accessToken = longData.access_token;
  const profileUrl = new URL(`https://graph.instagram.com/${instagramGraphVersion}/me`);
  profileUrl.searchParams.set("fields", "id,username,account_type,media_count");
  profileUrl.searchParams.set("access_token", accessToken);
  const profileResponse = await fetch(profileUrl);
  const profile = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok || profile.error || !profile.id || !profile.username) return fail(profile.error?.message || "Could not read the authorized Instagram profile. Make sure it is a Business or Creator account.");
  const encrypted = encryptInstagramToken(accessToken);
  await InstagramConnection.findOneAndUpdate({ owner: pending.owner }, { owner: pending.owner, instagramUserId: String(profile.id), username: profile.username, profile, ...encrypted, expiresAt: new Date(Date.now() + Number(longData.expires_in || 5184000) * 1000) }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.redirect(`${clientUrl}/?instagram=connected`);
}));
app.get("/api/instagram/account", requireAuth, asyncHandler(async (req, res) => {
  const connection = await getInstagramConnection(req.user._id);
  if (!connection) return res.json({ configured: false });
  const profile = await instagramUserGraphRequest(connection, "me", { fields: "id,username,account_type,media_count" });
  res.json({ configured: true, profile: { ...connection.profile, ...profile, profile_picture_url: connection.profile?.profile_picture_url || "" } });
}));
app.get("/api/instagram/media", requireAuth, asyncHandler(async (req, res) => {
  const connection = await getInstagramConnection(req.user._id);
  const page = await instagramUserGraphRequest(connection, "me/media", { fields: "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{id,media_type,media_url,thumbnail_url}", limit: 25, after: String(req.query.after || "").slice(0, 500) });
  res.json({ data: page.data || [], paging: { cursors: { after: page.paging?.cursors?.after || "" }, next: page.paging?.next || null, hasNext: Boolean(page.paging?.next) } });
}));
app.delete("/api/instagram/account", requireAuth, asyncHandler(async (req, res) => {
  await InstagramConnection.deleteOne({ owner: req.user._id });
  res.json({ disconnected: true });
}));
app.get("/api/instagram/media/download-by-url", requireAuth, asyncHandler(async (req, res) => {
  const connection = await getInstagramConnection(req.user._id);
  if (!connection) throw Object.assign(new Error("Connect your Instagram Professional account first. Only media from that connected account can be downloaded."), { statusCode: 403 });
  let target;
  try { target = new URL(String(req.query.url || "")); } catch { throw Object.assign(new Error("Enter a valid Instagram Reel URL."), { statusCode: 400 }); }
  if (!/(^|\.)instagram\.com$/i.test(target.hostname)) throw Object.assign(new Error("Only Instagram post and Reel URLs are supported here."), { statusCode: 400 });
  const match = target.pathname.replace(/\/+$/, "").match(/^\/(?:reel|reels|p|tv)\/([a-zA-Z0-9_-]+)$/i);
  if (!match) throw Object.assign(new Error("This Instagram URL does not contain a supported post or Reel ID."), { statusCode: 400 });
  const shortcode = match[1];
  let cursor = ""; let ownedMedia = null; let pagesChecked = 0;
  do {
    const page = await instagramUserGraphRequest(connection, "me/media", { fields: "id,media_type,permalink", limit: 100, after: cursor });
    ownedMedia = (page.data || []).find(item => {
      if (!item.permalink) return false;
      try { return new URL(item.permalink).pathname.replace(/\/+$/, "").split("/").filter(Boolean).at(-1) === shortcode; } catch { return false; }
    }) || null;
    cursor = page.paging?.cursors?.after || ""; pagesChecked += 1;
    if (ownedMedia || !page.paging?.next || pagesChecked >= 20) break;
  } while (cursor);
  if (!ownedMedia) throw Object.assign(new Error("This Reel is not available in the Instagram Professional account connected to ChatWave. Public Reel embeds can be viewed here, but Instagram's official API does not allow downloading arbitrary public Reels."), { statusCode: 403 });
  const media = await instagramUserGraphRequest(connection, ownedMedia.id, { fields: "id,media_type,media_url" });
  if (media.media_type !== "VIDEO" || !media.media_url) throw Object.assign(new Error("Instagram did not return a downloadable video for this post."), { statusCode: 400 });
  const mediaUrl = new URL(media.media_url);
  if (!/(^|\.)fbcdn\.net$/i.test(mediaUrl.hostname) && !/(^|\.)fbsbx\.com$/i.test(mediaUrl.hostname) && !/(^|\.)cdninstagram\.com$/i.test(mediaUrl.hostname)) throw Object.assign(new Error("Instagram returned an unsupported media host."), { statusCode: 502 });
  const fileResponse = await fetch(mediaUrl, { redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!fileResponse.ok || !fileResponse.body) throw Object.assign(new Error("Instagram could not provide this video file. Please try again later."), { statusCode: 502 });
  res.setHeader("Content-Type", fileResponse.headers.get("content-type") || "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="chatwave-instagram-${shortcode}.mp4"`);
  res.setHeader("Cache-Control", "private, no-store");
  Readable.fromWeb(fileResponse.body).pipe(res);
}));

async function fetchInstagramVideo(mediaUrl, maxRedirects = 5) {
  let current = new URL(mediaUrl);
  const allowedHost = (hostname) => /(^|\.)fbcdn\.net$/i.test(hostname)
    || /(^|\.)fbsbx\.com$/i.test(hostname)
    || /(^|\.)cdninstagram\.com$/i.test(hostname);
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    if (current.protocol !== "https:" || !allowedHost(current.hostname)) {
      throw Object.assign(new Error("Instagram returned an unsupported video delivery address."), { statusCode: 502 });
    }
    const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(60000), headers: { Accept: "video/*,application/octet-stream;q=0.9,*/*;q=0.5" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || hop === maxRedirects) throw Object.assign(new Error("Instagram video redirect limit was reached. Refresh the media list and try again."), { statusCode: 502 });
      current = new URL(location, current);
      continue;
    }
    return response;
  }
  throw Object.assign(new Error("Could not resolve Instagram's video download URL."), { statusCode: 502 });
}

app.get("/api/instagram/media/:id/download", requireAuth, asyncHandler(async (req, res) => {
  const connection = await getInstagramConnection(req.user._id);
  if (!connection) throw Object.assign(new Error("Connect your Instagram account first."), { statusCode: 403 });
  const mediaId = String(req.params.id || "");
  if (!/^\d+$/.test(mediaId)) throw Object.assign(new Error("Invalid Instagram video ID."), { statusCode: 400 });

  // Instagram's media object lookup is authorized by the connected account token.
  // We never accept a user-supplied media URL; the API returns the fresh CDN URL.
  const media = await instagramUserGraphRequest(connection, mediaId, { fields: "id,media_type,media_url,thumbnail_url,timestamp" });
  if (String(media.id) !== mediaId) throw Object.assign(new Error("Instagram did not verify this media item."), { statusCode: 403 });
  if (media.media_type !== "VIDEO") throw Object.assign(new Error("Only videos and Reels can be downloaded from this Instagram library."), { statusCode: 400 });
  if (!media.media_url) throw Object.assign(new Error("Instagram does not provide a downloadable file for this video. This can happen when the Reel uses licensed/copyrighted audio or Meta omits the media file under its download and rights rules. You can still view its thumbnail in ChatWave."), { statusCode: 403 });

  const fileResponse = await fetchInstagramVideo(media.media_url);
  if (!fileResponse.ok || !fileResponse.body) throw Object.assign(new Error(`Instagram's video server returned ${fileResponse.status}. Refresh the media list and try again.`), { statusCode: 502 });
  const contentType = (fileResponse.headers.get("content-type") || "video/mp4").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("video/") && contentType !== "application/octet-stream") {
    throw Object.assign(new Error("Instagram returned a non-video response. The download was stopped to avoid saving an error page."), { statusCode: 502 });
  }
  const maxBytes = Math.max(1, Number(process.env.INSTAGRAM_DOWNLOAD_MAX_MB || 500)) * 1024 * 1024;
  const declaredLength = Number(fileResponse.headers.get("content-length") || 0);
  if (declaredLength && declaredLength > maxBytes) throw Object.assign(new Error(`This video exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB download limit.`), { statusCode: 413 });
  const extension = contentType.includes("webm") ? "webm" : contentType.includes("quicktime") ? "mov" : "mp4";
  const safeId = mediaId.replace(/[^0-9]/g, "");
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="chatwave-instagram-${safeId}.${extension}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  let transferred = 0;
  const limiter = new Transform({ transform(chunk, _encoding, callback) {
    transferred += chunk.length;
    if (transferred > maxBytes) callback(Object.assign(new Error("This video exceeds the configured Instagram download limit."), { statusCode: 413 }));
    else callback(null, chunk);
  }});
  try {
    await pipeline(Readable.fromWeb(fileResponse.body), limiter, res);
  } catch (error) {
    if (res.headersSent) res.destroy(error);
    else throw error;
  }
}));

app.get("/api/health", (_req, res) => {
  const databaseState = mongoose.connection.readyState;
  res.status(databaseState === 1 ? 200 : 503).json({
    ok: true,
    api: "online",
    database: databaseState === 1 ? "connected" : databaseState === 2 ? "connecting" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please wait 15 minutes and try again." }
});
const otpRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many OTP requests. Wait 10 minutes before trying again." }
});
const normalizePhone = value => {
  let phone = String(value || "").trim().replace(/[\s().-]/g, "");
  // Convenience for Indian users who enter a 10-digit mobile number.
  if (/^[6-9]\d{9}$/.test(phone)) phone = `+91${phone}`;
  return phone;
};
const phonePattern = /^\+[1-9]\d{7,14}$/;
const twilioConfigured = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID);
const twilioClient = () => {
  if (!twilioConfigured()) throw Object.assign(new Error("SMS OTP is not configured. Add Twilio Verify credentials to server/.env."), { statusCode: 503 });
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

// Stage 1: request a real SMS verification code using Twilio Verify.
app.post("/api/auth/otp/start", otpRateLimit, asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!phonePattern.test(phone)) return res.status(400).json({ message: "Enter a valid mobile number with country code, e.g. +919876543210, or a 10-digit Indian mobile number." });
  if (await User.exists({ phone })) return res.status(409).json({ message: "This phone number already has an account. Please sign in." });
  try {
    const result = await twilioClient().verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });
    if (result.status !== "pending") return res.status(502).json({ message: "The SMS verification request could not be started. Please try again." });
    res.json({ message: "Verification code sent by SMS.", status: "pending" });
  } catch (e) {
    console.error("SMS OTP start failed:", e?.code || "", e?.message || e);
    // Twilio provider errors are upstream failures, not malformed app requests.
    // Return an actionable message while keeping provider credentials private.
    const status = e.statusCode === 503 ? 503 : 502;
    const providerCode = e.code ? ` (Twilio code ${e.code})` : "";
    res.status(status).json({ message: e.statusCode === 503 ? e.message : `Twilio could not send the OTP${providerCode}. Verify that the phone number includes the country code, TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct, and TWILIO_VERIFY_SERVICE_SID is a Verify Service SID. Check the server terminal for details.` });
  }
}));

// Stage 2: verify the OTP with Twilio and issue a short-lived, phone-bound signup ticket.
app.post("/api/auth/otp/check", otpRateLimit, asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const code = String(req.body.code || "").trim();
  if (!phonePattern.test(phone) || !/^\d{4,10}$/.test(code)) return res.status(400).json({ message: "Enter your phone number and the SMS verification code." });
  if (await User.exists({ phone })) return res.status(409).json({ message: "This phone number already has an account. Please sign in." });
  try {
    const result = await twilioClient().verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });
    if (result.status !== "approved") return res.status(400).json({ message: "That OTP is invalid or expired. Request a new code and try again." });
    const signupTicket = jwt.sign({ purpose: "phone-signup", phone }, process.env.JWT_SECRET, { expiresIn: "10m" });
    res.json({ verified: true, signupTicket, expiresInSeconds: 600 });
  } catch (e) {
    console.error("SMS OTP verification failed:", e?.code || "", e?.message || e);
    res.status(e.statusCode || 502).json({ message: e.statusCode === 503 ? e.message : "Could not verify the OTP. Check the code and try again." });
  }
}));

// Stage 3: only a verified phone ticket can create an account and set a password.
app.post("/api/auth/register", authRateLimit, asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password || "");
  const signupTicket = String(req.body.signupTicket || "");
  if (name.length < 2 || name.length > 60 || !phonePattern.test(phone) || password.length < 10 || password.length > 128) {
    return res.status(400).json({ message: "Enter your name, verified phone number, and a password between 10 and 128 characters." });
  }
  let ticket;
  try { ticket = jwt.verify(signupTicket, process.env.JWT_SECRET); } catch { return res.status(401).json({ message: "Phone verification expired. Verify your number again." }); }
  if (ticket.purpose !== "phone-signup" || ticket.phone !== phone) return res.status(401).json({ message: "Phone verification does not match this number. Verify again." });
  try {
    const user = await User.create({ name, phone, phoneVerifiedAt: new Date(), passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: "This phone number already has an account. Please sign in." });
    console.error("Registration error:", e?.message || e);
    res.status(500).json({ message: "Account creation failed. Please try again." });
  }
}));

// Existing accounts can sign in with phone + password; OTP is only required for signup/phone verification.
app.post("/api/auth/login", authRateLimit, asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password || "");
  if (!phonePattern.test(phone) || !password) return res.status(400).json({ message: "Enter your phone number and password." });
  try {
    const user = await User.findOne({ phone });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Incorrect phone number or password." });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) {
    console.error("Login error:", e?.message || e);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
}));

app.get("/api/users", requireAuth, asyncHandler(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select("_id name phone email avatar about lastSeen").sort({ name: 1 }).limit(200);
  res.json(users);
}));

app.patch("/api/users/me", requireAuth, asyncHandler(async (req, res) => {
  const updates = {};
  if (typeof req.body.name === "string") updates.name = req.body.name.trim().slice(0, 60);
  if (typeof req.body.about === "string") updates.about = req.body.about.trim().slice(0, 140);
  if (req.body.privacy && typeof req.body.privacy === "object") {
    const p = req.body.privacy; updates.privacy = {};
    if (["everyone", "contacts", "nobody"].includes(p.lastSeen)) updates["privacy.lastSeen"] = p.lastSeen;
    if (["everyone", "contacts", "nobody"].includes(p.profilePhoto)) updates["privacy.profilePhoto"] = p.profilePhoto;
    if (typeof p.readReceipts === "boolean") updates["privacy.readReceipts"] = p.readReceipts;
    delete updates.privacy;
  }
  if (req.body.preferences && typeof req.body.preferences === "object") {
    const p = req.body.preferences;
    if (["navy-blue", "light", "midnight"].includes(p.theme)) updates["preferences.theme"] = p.theme;
    if (typeof p.wallpaper === "string") updates["preferences.wallpaper"] = p.wallpaper.slice(0, 120);
    if (/^#[0-9a-fA-F]{6}$/.test(String(p.accent || ""))) updates["preferences.accent"] = p.accent;
    if (typeof p.notifications === "boolean") updates["preferences.notifications"] = p.notifications;
  }
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("_id name phone email avatar about lastSeen privacy preferences");
  res.json(user);
}));

app.post("/api/uploads/avatar", requireAuth, asyncHandler(async (req, res) => {
  const saved = await saveDataUrl(req.body.dataUrl, req.body.fileName || "profile.jpg", ["image/jpeg", "image/png", "image/webp"]);
  const avatar = `${req.protocol}://${req.get("host")}${saved.url}`;
  const user = await User.findByIdAndUpdate(req.user._id, { avatar }, { new: true }).select("_id name phone email avatar about lastSeen privacy");
  io.emit("profile:changed", { userId: String(user._id), avatar: user.avatar, name: user.name });
  res.json(user);
}));

app.post("/api/uploads/file", requireAuth, asyncHandler(async (req, res) => {
  const saved = await saveDataUrl(req.body.dataUrl, req.body.fileName || "attachment", null);
  res.status(201).json({ ...saved, url: `${req.protocol}://${req.get("host")}${saved.url}` });
}));

// Personal resume library. Files are uploaded through the authenticated upload endpoint; metadata is private to the owner.
app.get("/api/resumes", requireAuth, asyncHandler(async (req, res) => {
  res.json(await Resume.find({ owner: req.user._id }).sort({ category: 1, createdAt: -1 }).lean());
}));
app.post("/api/resumes", requireAuth, asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim().slice(0, 120);
  const category = String(req.body.category || "Other").trim().slice(0, 60);
  const fileUrl = String(req.body.fileUrl || "").trim().slice(0, 1000);
  const fileName = String(req.body.fileName || "resume").trim().slice(0, 180);
  const mimeType = String(req.body.mimeType || "application/pdf").slice(0, 120);
  const fileSize = Math.max(0, Number(req.body.fileSize) || 0);
  if (!title || !category || !/^\/uploads\/[a-f0-9-]+\.[a-z0-9]+$/i.test(fileUrl)) return res.status(400).json({ message: "Add a title, category and upload a valid resume file first." });
  if (fileSize > 8 * 1024 * 1024) return res.status(413).json({ message: "Resume files must be 8 MB or smaller." });
  if (!["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(mimeType)) return res.status(415).json({ message: "Only PDF, DOC and DOCX resumes are supported." });
  const resume = await Resume.create({ owner: req.user._id, title, category, fileUrl, fileName, mimeType, fileSize });
  res.status(201).json(resume);
}));
app.delete("/api/resumes/:id", requireAuth, asyncHandler(async (req, res) => {
  const removed = await Resume.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!removed) return res.status(404).json({ message: "Resume not found." });
  res.json({ deleted: true });
}));

app.post("/api/users/:id/block", requireAuth, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: "Choose a valid user." });
  const target = await User.findById(req.params.id).select("_id"); if (!target) return res.status(404).json({ message: "User not found." });
  const user = await User.findById(req.user._id); const blocked = user.blockedUsers.some(id => String(id) === String(target._id));
  user.blockedUsers = blocked ? user.blockedUsers.filter(id => String(id) !== String(target._id)) : [...user.blockedUsers, target._id]; await user.save();
  res.json({ blocked: !blocked });
}));
app.post("/api/users/:id/report", requireAuth, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: "Choose a valid user." });
  if (!await User.exists({ _id: req.params.id })) return res.status(404).json({ message: "User not found." });
  const report = await UserReport.create({ reporter: req.user._id, reportedUser: req.params.id, reason: String(req.body.reason || "").trim().slice(0, 500) });
  res.status(201).json({ submitted: true, reportId: report._id });
}));

app.get("/api/conversations", requireAuth, asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ members: req.user._id })
    .populate("members", "_id name phone email avatar about lastSeen")
    .populate({ path: "lastMessage", select: "text sender createdAt kind" })
    .sort({ updatedAt: -1 });
  res.json(conversations);
}));

app.post("/api/conversations/direct", requireAuth, asyncHandler(async (req, res) => {
  const targetId = String(req.body.userId || "");
  if (!mongoose.isValidObjectId(targetId) || targetId === req.user._id.toString()) return res.status(400).json({ message: "Choose a valid contact." });
  const target = await User.findById(targetId);
  if (!target) return res.status(404).json({ message: "Contact not found." });
  const currentUser = await User.findById(req.user._id).select("blockedUsers");
  if (currentUser.blockedUsers.some(id => String(id) === String(target._id)) || target.blockedUsers.some(id => String(id) === String(req.user._id))) return res.status(403).json({ message: "This contact is blocked. Unblock them before starting a chat." });
  let conversation = await Conversation.findOne({ isGroup: false, members: { $all: [req.user._id, target._id], $size: 2 } });
  if (!conversation) conversation = await Conversation.create({ members: [req.user._id, target._id], isGroup: false });
  conversation = await Conversation.findById(conversation._id).populate("members", "_id name phone email avatar about lastSeen");
  res.json(conversation);
}));

app.post("/api/conversations/group", requireAuth, asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim().slice(0, 80);
  const ids = Array.isArray(req.body.memberIds) ? req.body.memberIds.filter(m => mongoose.isValidObjectId(m)) : [];
  const uniqueIds = [...new Set([...ids, req.user._id.toString()])];
  if (title.length < 2 || uniqueIds.length < 2) return res.status(400).json({ message: "A group needs a name and at least one other member." });
  const users = await User.find({ _id: { $in: uniqueIds } }).select("_id");
  if (users.length !== uniqueIds.length) return res.status(400).json({ message: "One or more members do not exist." });
  const description = String(req.body.description || "").trim().slice(0, 500);
  const conversation = await Conversation.create({ title, description, members: users.map(u => u._id), admins: [req.user._id], isGroup: true });
  res.status(201).json(await Conversation.findById(conversation._id).populate("members", "_id name phone email avatar about lastSeen"));
}));

app.get("/api/conversations/:id/messages", requireAuth, asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, members: req.user._id });
  if (!conversation) return res.status(404).json({ message: "Conversation not found." });
  await Message.deleteMany({ conversation: conversation._id, expiresAt: { $ne: null, $lte: new Date() } });
  const messages = await Message.find({ conversation: conversation._id, clearedFor: { $ne: req.user._id }, $or: [{ scheduledAt: null }, { scheduledAt: { $exists: false } }, { deliveredAt: { $ne: null } }] })
    .populate("sender", "_id name avatar").populate("reactions.user", "_id name").populate("replyTo", "text sender").sort({ createdAt: 1 }).limit(500);
  const unreadIds = messages.filter(m => !m.readBy.some(id => String(id) === String(req.user._id)) && String(m.sender?._id || m.sender) !== String(req.user._id)).map(m => m._id);
  if (unreadIds.length) { await Message.updateMany({ _id: { $in: unreadIds } }, { $addToSet: { readBy: req.user._id } }); io.to(`conversation:${conversation._id}`).emit("messages:read", { conversationId: conversation._id, userId: req.user._id, messageIds: unreadIds }); }
  res.json(messages);
}));

// Clear messages only for the requesting member; other participants retain their copies.
app.post("/api/conversations/:id/clear", requireAuth, asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, members: req.user._id }).select("_id");
  if (!conversation) return res.status(404).json({ message: "Conversation not found." });
  const result = await Message.updateMany({ conversation: conversation._id, clearedFor: { $ne: req.user._id } }, { $addToSet: { clearedFor: req.user._id } });
  res.json({ success: true, cleared: result.modifiedCount || 0 });
}));

// Message actions: every operation verifies conversation membership and message ownership/permissions.
app.patch("/api/messages/:id", requireAuth, asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ message: "Message not found." });
  const conversation = await Conversation.findOne({ _id: message.conversation, members: req.user._id });
  if (!conversation) return res.status(403).json({ message: "You cannot access this message." });
  if (String(message.sender) !== String(req.user._id)) return res.status(403).json({ message: "You can only edit your own messages." });
  const text = String(req.body.text || "").trim();
  if (!text || text.length > 5000) return res.status(400).json({ message: "Message must be 1–5000 characters." });
  message.text = text; message.editedAt = new Date(); await message.save();
  const populated = await Message.findById(message._id).populate("sender", "_id name avatar");
  io.to(`conversation:${message.conversation}`).emit("message:changed", populated); res.json(populated);
}));
app.delete("/api/messages/:id", requireAuth, asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ message: "Message not found." });
  const conversation = await Conversation.findOne({ _id: message.conversation, members: req.user._id });
  if (!conversation) return res.status(403).json({ message: "You cannot access this message." });
  if (String(message.sender) !== String(req.user._id)) return res.status(403).json({ message: "You can only delete your own messages." });
  message.text = "This message was deleted"; message.kind = "system"; message.fileUrl = ""; message.deletedForEveryone = true; await message.save();
  const populated = await Message.findById(message._id).populate("sender", "_id name avatar");
  io.to(`conversation:${message.conversation}`).emit("message:changed", populated); res.json(populated);
}));
app.post("/api/messages/:id/reaction", requireAuth, asyncHandler(async (req, res) => {
  const emoji = String(req.body.emoji || "").slice(0, 16); const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ message: "Message not found." });
  if (!await Conversation.exists({ _id: message.conversation, members: req.user._id })) return res.status(403).json({ message: "Not allowed." });
  message.reactions = message.reactions.filter(r => String(r.user) !== String(req.user._id));
  if (emoji) message.reactions.push({ user: req.user._id, emoji }); await message.save();
  const populated = await Message.findById(message._id).populate("sender", "_id name avatar").populate("reactions.user", "_id name");
  io.to(`conversation:${message.conversation}`).emit("message:changed", populated); res.json(populated);
}));
app.post("/api/messages/:id/star", requireAuth, asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id); if (!message) return res.status(404).json({ message: "Message not found." });
  if (!await Conversation.exists({ _id: message.conversation, members: req.user._id })) return res.status(403).json({ message: "Not allowed." });
  const has = message.starredBy.some(id => String(id) === String(req.user._id));
  message.starredBy = has ? message.starredBy.filter(id => String(id) !== String(req.user._id)) : [...message.starredBy, req.user._id];
  await message.save(); res.json({ starred: !has, messageId: message._id });
}));
app.post("/api/conversations/:id/archive", requireAuth, asyncHandler(async (req, res) => {
  const c = await Conversation.findOne({ _id: req.params.id, members: req.user._id }); if (!c) return res.status(404).json({ message: "Conversation not found." });
  const has = c.archivedBy.some(id => String(id) === String(req.user._id)); c.archivedBy = has ? c.archivedBy.filter(id => String(id) !== String(req.user._id)) : [...c.archivedBy, req.user._id]; await c.save(); res.json({ archived: !has });
}));
app.post("/api/conversations/:id/mute", requireAuth, asyncHandler(async (req, res) => {
  const c = await Conversation.findOne({ _id: req.params.id, members: req.user._id }); if (!c) return res.status(404).json({ message: "Conversation not found." });
  const has = c.mutedBy.some(id => String(id) === String(req.user._id)); c.mutedBy = has ? c.mutedBy.filter(id => String(id) !== String(req.user._id)) : [...c.mutedBy, req.user._id]; await c.save(); res.json({ muted: !has });
}));
app.post("/api/conversations/:id/pin", requireAuth, asyncHandler(async (req, res) => {
  const c = await Conversation.findOne({ _id: req.params.id, members: req.user._id }); if (!c) return res.status(404).json({ message: "Conversation not found." });
  const has = c.pinnedBy.some(id => String(id) === String(req.user._id)); c.pinnedBy = has ? c.pinnedBy.filter(id => String(id) !== String(req.user._id)) : [...c.pinnedBy, req.user._id]; await c.save(); io.to(`user:${req.user._id}`).emit("conversation:updated", { conversationId: c._id }); res.json({ pinned: !has });
}));
app.patch("/api/conversations/:id/settings", requireAuth, asyncHandler(async (req, res) => {
  const c = await Conversation.findOne({ _id: req.params.id, members: req.user._id }); if (!c) return res.status(404).json({ message: "Conversation not found." });
  if (req.body.disappearingAfter !== undefined) { const seconds = Number(req.body.disappearingAfter); if (![0, 86400, 604800, 7776000].includes(seconds)) return res.status(400).json({ message: "Choose a supported disappearing-message timer." }); c.disappearingAfter = seconds; }
  if (typeof req.body.description === "string" && c.isGroup) c.description = req.body.description.trim().slice(0, 500);
  await c.save(); io.to(`conversation:${c._id}`).emit("conversation:updated", { conversationId: c._id }); res.json({ disappearingAfter: c.disappearingAfter, description: c.description });
}));
app.post("/api/conversations/:id/schedule", requireAuth, asyncHandler(async (req, res) => {
  const c = await Conversation.findOne({ _id: req.params.id, members: req.user._id }); if (!c) return res.status(404).json({ message: "Conversation not found." });
  const text = String(req.body.text || "").trim(); const scheduledAt = new Date(req.body.scheduledAt);
  if (!text || text.length > 5000 || Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date() || scheduledAt > new Date(Date.now() + 30 * 86400000)) return res.status(400).json({ message: "Enter a message and a future time within the next 30 days." });
  const message = await Message.create({ conversation: c._id, sender: req.user._id, text, scheduledAt, readBy: [req.user._id] }); res.status(201).json({ scheduled: true, messageId: message._id, scheduledAt });
}));
app.get("/api/conversations/:id/scheduled", requireAuth, asyncHandler(async (req, res) => {
  const c = await Conversation.findOne({ _id: req.params.id, members: req.user._id }); if (!c) return res.status(404).json({ message: "Conversation not found." });
  res.json(await Message.find({ conversation: c._id, sender: req.user._id, scheduledAt: { $gt: new Date() }, deliveredAt: null }).select("text scheduledAt createdAt").sort({ scheduledAt: 1 }));
}));
app.delete("/api/messages/:id/schedule", requireAuth, asyncHandler(async (req, res) => {
  const m = await Message.findOne({ _id: req.params.id, sender: req.user._id, scheduledAt: { $gt: new Date() }, deliveredAt: null }); if (!m) return res.status(404).json({ message: "Scheduled message not found." }); await m.deleteOne(); res.json({ cancelled: true });
}));
app.get("/api/conversations/:id/polls", requireAuth, asyncHandler(async (req, res) => { const c = await Conversation.findOne({ _id: req.params.id, members: req.user._id }); if (!c) return res.status(404).json({ message: "Conversation not found." }); res.json(await Poll.find({ conversation: c._id }).populate("creator", "_id name").sort({ createdAt: -1 }).limit(50)); }));
app.post("/api/conversations/:id/polls", requireAuth, asyncHandler(async (req, res) => {
  const c = await Conversation.findOne({ _id: req.params.id, members: req.user._id }); if (!c) return res.status(404).json({ message: "Conversation not found." });
  const question = String(req.body.question || "").trim().slice(0, 240); const labels = Array.isArray(req.body.options) ? [...new Set(req.body.options.map(v => String(v).trim().slice(0, 100)).filter(Boolean))].slice(0, 10) : [];
  if (question.length < 3 || labels.length < 2) return res.status(400).json({ message: "A poll needs a question and at least two options." });
  const poll = await Poll.create({ conversation: c._id, creator: req.user._id, question, options: labels.map(label => ({ label })), multiple: Boolean(req.body.multiple) }); const result = await Poll.findById(poll._id).populate("creator", "_id name"); io.to(`conversation:${c._id}`).emit("poll:new", result); res.status(201).json(result);
}));
app.post("/api/polls/:id/vote", requireAuth, asyncHandler(async (req, res) => {
  const poll = await Poll.findById(req.params.id); if (!poll) return res.status(404).json({ message: "Poll not found." });
  if (!await Conversation.exists({ _id: poll.conversation, members: req.user._id })) return res.status(403).json({ message: "Not allowed." }); if (poll.closed) return res.status(400).json({ message: "This poll is closed." });
  const indexes = [...new Set((Array.isArray(req.body.options) ? req.body.options : [req.body.option]).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < poll.options.length))]; if (!indexes.length || (!poll.multiple && indexes.length > 1)) return res.status(400).json({ message: "Choose a valid option." });
  poll.options.forEach(o => { o.votes = o.votes.filter(id => String(id) !== String(req.user._id)); }); indexes.forEach(i => poll.options[i].votes.push(req.user._id)); await poll.save(); const result = await Poll.findById(poll._id).populate("creator", "_id name"); io.to(`conversation:${poll.conversation}`).emit("poll:changed", result); res.json(result);
}));
app.get("/api/conversations/:id/events", requireAuth, asyncHandler(async (req, res) => { const c = await Conversation.findOne({ _id: req.params.id, members: req.user._id }); if (!c) return res.status(404).json({ message: "Conversation not found." }); res.json(await ChatEvent.find({ conversation: c._id, startsAt: { $gte: new Date(Date.now() - 86400000) } }).populate("creator", "_id name").sort({ startsAt: 1 }).limit(50)); }));
app.post("/api/conversations/:id/events", requireAuth, asyncHandler(async (req, res) => {
  const c = await Conversation.findOne({ _id: req.params.id, members: req.user._id }); if (!c) return res.status(404).json({ message: "Conversation not found." }); const title = String(req.body.title || "").trim().slice(0, 120); const startsAt = new Date(req.body.startsAt);
  if (title.length < 2 || Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) return res.status(400).json({ message: "Enter an event title and a future date/time." }); const event = await ChatEvent.create({ conversation: c._id, creator: req.user._id, title, description: String(req.body.description || "").slice(0, 500), startsAt, attendees: [{ user: req.user._id, response: "yes" }] }); const result = await ChatEvent.findById(event._id).populate("creator", "_id name"); io.to(`conversation:${c._id}`).emit("event:new", result); res.status(201).json(result);
}));
app.post("/api/events/:id/respond", requireAuth, asyncHandler(async (req, res) => { const event = await ChatEvent.findById(req.params.id); if (!event) return res.status(404).json({ message: "Event not found." }); if (!await Conversation.exists({ _id: event.conversation, members: req.user._id })) return res.status(403).json({ message: "Not allowed." }); const response = ["yes", "no", "maybe"].includes(req.body.response) ? req.body.response : null; if (!response) return res.status(400).json({ message: "Choose yes, no or maybe." }); event.attendees = event.attendees.filter(a => String(a.user) !== String(req.user._id)); event.attendees.push({ user: req.user._id, response }); await event.save(); const result = await ChatEvent.findById(event._id).populate("creator", "_id name"); io.to(`conversation:${event.conversation}`).emit("event:changed", result); res.json(result); }));
app.get("/api/statuses", requireAuth, asyncHandler(async (_req, res) => {
  const statuses = await Status.find({ expiresAt: { $gt: new Date() } }).populate("author", "_id name avatar about").sort({ createdAt: -1 }).limit(300); res.json(statuses);
}));
app.post("/api/statuses", requireAuth, asyncHandler(async (req, res) => {
  const text = String(req.body.text || "").trim().slice(0, 700); const background = String(req.body.background || "#075e54").slice(0, 30); const mediaUrl = String(req.body.mediaUrl || "").slice(0, 1000); const mediaType = String(req.body.mediaType || "").slice(0, 100);
  if (!text && !mediaUrl) return res.status(400).json({ message: "Add text, a photo, or a video to your status." });
  if (mediaUrl && (!/^(?:https?:\/\/[^\s]+)?\/uploads\/[a-f0-9-]+\.[a-z0-9]+(?:\?[^\s]*)?$/i.test(mediaUrl) || !["image/jpeg","image/png","image/webp","image/gif","video/mp4"].includes(mediaType))) return res.status(400).json({ message: "Invalid status media. Upload a photo or MP4 video first." });
  const status = await Status.create({ author: req.user._id, text, background, mediaUrl, mediaType }); const populated = await Status.findById(status._id).populate("author", "_id name avatar"); io.emit("status:new", populated); res.status(201).json(populated);
}));
app.post("/api/statuses/:id/view", requireAuth, asyncHandler(async (req, res) => {
  const status = await Status.findOneAndUpdate({ _id: req.params.id, expiresAt: { $gt: new Date() } }, { $addToSet: { viewers: req.user._id } }, { new: true });
  if (!status) return res.status(404).json({ message: "Status not found." }); res.json({ ok: true });
}));

// Search only conversations the authenticated user belongs to; never expose other users' messages.
app.get("/api/search/messages", requireAuth, asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 120);
  if (q.length < 2) return res.json([]);
  const conversations = await Conversation.find({ members: req.user._id }).select("_id title isGroup members").lean();
  const ids = conversations.map(c => c._id);
  if (!ids.length) return res.json([]);
  const matches = await Message.find({ conversation: { $in: ids }, text: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }, deletedForEveryone: { $ne: true }, $or: [{ scheduledAt: null }, { scheduledAt: { $exists: false } }, { deliveredAt: { $ne: null } }] })
    .populate("sender", "_id name avatar").sort({ createdAt: -1 }).limit(100).lean();
  const byId = new Map(conversations.map(c => [String(c._id), c]));
  res.json(matches.map(m => ({ ...m, conversationInfo: byId.get(String(m.conversation)) })));
}));

// Account-owned export of server-side data. Password hashes and auth tokens are never exported.
app.get("/api/backup/export", requireAuth, asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ members: req.user._id }).populate("members", "_id name phone avatar about").lean();
  const conversationIds = conversations.map(c => c._id);
  const [messages, statuses, aiConversations, polls, events] = await Promise.all([
    Message.find({ conversation: { $in: conversationIds } }).populate("sender", "_id name avatar").lean(),
    Status.find({ author: req.user._id }).lean(),
    AIConversation.find({ owner: req.user._id }).select("title messages createdAt updatedAt").lean(),
    Poll.find({ conversation: { $in: conversationIds } }).lean(),
    ChatEvent.find({ conversation: { $in: conversationIds } }).lean()
  ]);
  res.setHeader("Content-Disposition", `attachment; filename=chatwave-backup-${new Date().toISOString().slice(0,10)}.json`);
  res.json({ app: "ChatWave", version: 1, exportedAt: new Date().toISOString(), profile: { name: req.user.name, _id: req.user._id }, conversations, messages, statuses, aiConversations, polls, events });
}));

// Store a server-side snapshot per account. Keep the newest five snapshots to limit storage growth.
app.post("/api/backup", requireAuth, asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ members: req.user._id }).populate("members", "_id name phone avatar about").lean();
  const conversationIds = conversations.map(c => c._id);
  const [messages, statuses, aiConversations, polls, events] = await Promise.all([
    Message.find({ conversation: { $in: conversationIds } }).lean(),
    Status.find({ author: req.user._id }).lean(),
    AIConversation.find({ owner: req.user._id }).select("title messages createdAt updatedAt").lean(),
    Poll.find({ conversation: { $in: conversationIds } }).lean(),
    ChatEvent.find({ conversation: { $in: conversationIds } }).lean()
  ]);
  const payload = { app: "ChatWave", version: 1, exportedAt: new Date().toISOString(), profile: { _id: req.user._id, name: req.user.name }, conversations, messages, statuses, aiConversations, polls, events };
  const bytes = Buffer.byteLength(JSON.stringify(payload));
  if (bytes > 12 * 1024 * 1024) return res.status(413).json({ message: "Backup exceeds the 12 MB snapshot limit. Download an export instead." });
  const backup = await ChatBackup.create({ owner: req.user._id, label: `Backup ${new Date().toLocaleString()}`, payload, bytes });
  const old = await ChatBackup.find({ owner: req.user._id }).sort({ createdAt: -1 }).select("_id").skip(5).lean();
  if (old.length) await ChatBackup.deleteMany({ _id: { $in: old.map(b => b._id) }, owner: req.user._id });
  res.status(201).json({ id: backup._id, label: backup.label, bytes, createdAt: backup.createdAt, retainedSnapshots: Math.min(5, (await ChatBackup.countDocuments({ owner: req.user._id }))) });
}));
app.get("/api/backup", requireAuth, asyncHandler(async (req, res) => {
  const backups = await ChatBackup.find({ owner: req.user._id }).select("label bytes createdAt updatedAt").sort({ createdAt: -1 }).limit(5).lean();
  res.json(backups);
}));

// Group membership is restricted to existing group members; only admins can add/remove people.
app.patch("/api/conversations/:id/members", requireAuth, asyncHandler(async (req, res) => {
  const group = await Conversation.findOne({ _id: req.params.id, isGroup: true, members: req.user._id });
  if (!group) return res.status(404).json({ message: "Group not found." });
  const isAdmin = group.admins.some(id => String(id) === String(req.user._id)) || String(group.members[0]) === String(req.user._id);
  if (!isAdmin) return res.status(403).json({ message: "Only group admins can manage members." });
  const action = req.body.action;
  const userId = String(req.body.userId || "");
  if (!["add", "remove"].includes(action) || !mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "Choose a valid member action and user." });
  if (action === "add") {
    if (!await User.exists({ _id: userId })) return res.status(404).json({ message: "User not found." });
    if (!group.members.some(id => String(id) === userId)) group.members.push(userId);
  } else {
    if (userId === String(group.members[0])) return res.status(400).json({ message: "Transfer admin ownership before removing the group creator." });
    group.members = group.members.filter(id => String(id) !== userId);
    group.admins = group.admins.filter(id => String(id) !== userId);
  }
  await group.save();
  const populated = await Conversation.findById(group._id).populate("members", "_id name phone email avatar about lastSeen");
  io.to(`conversation:${group._id}`).emit("conversation:updated", { conversationId: String(group._id) });
  res.json(populated);
}));

// ---- AI chat privacy -------------------------------------------------------------------------
// Every AI conversation belongs to exactly one user (`owner`). Rules enforced below:
//  * JWT required (requireAuth) on every route.
//  * The owner is part of the DATABASE query ({ _id, owner: req.user._id }) for read, update and delete, so a
//    guessed/changed conversation ID can never match another user's document.
//  * "Not yours" and "does not exist" return the same 404, so IDs cannot be probed.
//  * Malformed IDs are rejected before touching the database (no CastError / operator injection).
const noStore = (_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); };
const aiRateLimit = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, keyGenerator: req => String(req.user?._id || req.ip), message: { message: "Too many AI requests. Please slow down." } });
const AI_NOT_FOUND = { message: "AI conversation not found." };
function validObjectIdParam(name = "id") {
  return (req, res, next) => (typeof req.params[name] === "string" && mongoose.isValidObjectId(req.params[name]) && /^[a-f0-9]{24}$/i.test(req.params[name])) ? next() : res.status(404).json(AI_NOT_FOUND);
}
const ownedAIFilter = (id, user) => ({ _id: String(id), owner: user._id });

app.get("/api/ai/conversations", requireAuth, noStore, asyncHandler(async (req, res) => {
  const items = await AIConversation.find({ owner: req.user._id }).sort({ updatedAt: -1 }).select("title messages createdAt updatedAt").limit(100).lean();
  res.json(items.map(c => ({ _id: c._id, title: c.title, updatedAt: c.updatedAt, createdAt: c.createdAt, messageCount: c.messages?.length || 0, lastMessage: c.messages?.at(-1)?.content || "" })));
}));
app.get("/api/ai/conversations/:id", requireAuth, noStore, validObjectIdParam(), asyncHandler(async (req, res) => {
  const item = await AIConversation.findOne(ownedAIFilter(req.params.id, req.user)).lean();
  if (!item) return res.status(404).json(AI_NOT_FOUND);
  res.json(item);
}));
app.patch("/api/ai/conversations/:id", requireAuth, noStore, validObjectIdParam(), asyncHandler(async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.replace(/\s+/g, " ").trim().slice(0, 120) : "";
  if (!title) return res.status(400).json({ message: "Enter a title for this AI chat." });
  const item = await AIConversation.findOneAndUpdate(ownedAIFilter(req.params.id, req.user), { $set: { title } }, { new: true }).select("title updatedAt").lean();
  if (!item) return res.status(404).json(AI_NOT_FOUND);
  res.json({ _id: item._id, title: item.title, updatedAt: item.updatedAt });
}));
app.delete("/api/ai/conversations/:id", requireAuth, noStore, validObjectIdParam(), asyncHandler(async (req, res) => {
  const result = await AIConversation.deleteOne(ownedAIFilter(req.params.id, req.user));
  if (!result.deletedCount) return res.status(404).json(AI_NOT_FOUND);
  res.json({ ok: true });
}));

app.post("/api/ai", requireAuth, noStore, aiRateLimit, asyncHandler(async (req, res) => {
  // Accept a dedicated Groq key, while remaining compatible with older .env files
  // that stored a Groq key in XAI_API_KEY. A gsk_ key must never be sent to xAI.
  const groqKey = process.env.GROQ_API_KEY ||
    (process.env.XAI_API_KEY?.startsWith("gsk_") ? process.env.XAI_API_KEY : "");
  const xaiKey = process.env.XAI_API_KEY && !process.env.XAI_API_KEY.startsWith("gsk_")
    ? process.env.XAI_API_KEY
    : "";
  const provider = (process.env.AI_PROVIDER || (groqKey ? "groq" : "xai")).toLowerCase();
  const apiKey = provider === "groq" ? groqKey : xaiKey;
  if (!apiKey) {
    return res.status(503).json({
      message: provider === "groq"
        ? "Groq AI is not configured. Add GROQ_API_KEY to server/.env and restart the backend."
        : "xAI Grok is not configured. Add XAI_API_KEY to server/.env and restart the backend."
    });
  }

  const prompt = String(req.body.prompt || "").trim().slice(0, 8000);
  const requestedMode = String(req.body.mode || "answer");
  const mode = ["answer", "reply", "summarize", "translate", "rewrite"].includes(requestedMode) ? requestedMode : "answer";
  if (!prompt) return res.status(400).json({ message: "Enter a prompt first." });

  // Verify ownership first (before spending provider quota). conversationId must be a plain 24-hex string.
  const rawConversationId = req.body.conversationId;
  const hasConversationId = rawConversationId !== undefined && rawConversationId !== null && rawConversationId !== "";
  if (hasConversationId) {
    if (typeof rawConversationId !== "string" || !/^[a-f0-9]{24}$/i.test(rawConversationId)) return res.status(404).json({ message: "AI conversation not found. Start a new AI chat." });
    const owned = await AIConversation.exists(ownedAIFilter(rawConversationId, req.user));
    if (!owned) return res.status(404).json({ message: "AI conversation not found. Start a new AI chat." });
  }

  try {
    const defaultBaseURL = provider === "groq"
      ? "https://api.groq.com/openai/v1"
      : "https://api.x.ai/v1";
    const configuredBaseURL = provider === "groq"
      ? (process.env.GROQ_BASE_URL || (process.env.XAI_API_KEY?.startsWith("gsk_") ? "https://api.groq.com/openai/v1" : ""))
      : process.env.XAI_BASE_URL;
    const client = new OpenAI({
      apiKey,
      baseURL: configuredBaseURL || defaultBaseURL,
      timeout: 90_000,
      maxRetries: 2
    });
    const system = mode === "reply"
      ? "You are a helpful messaging assistant. Draft a concise, natural reply. Return only the suggested reply."
      : mode === "summarize"
      ? "Summarize the supplied conversation clearly in short bullet points. Do not invent facts."
      : mode === "translate"
      ? "Translate the supplied message into the target language requested by the user. Preserve meaning, names, tone, and formatting. If no target language is specified, ask which language they want. Return only the translation or concise clarification."
      : mode === "rewrite"
      ? "Rewrite the supplied message to be clearer and more natural while preserving the intended meaning. Return only the rewritten message."
      : "You are ChatWave AI, a friendly assistant inside a messaging app. Be accurate, concise, and helpful.";
    const model = process.env.AI_MODEL || (provider === "groq" ? "openai/gpt-oss-120b" : "grok-3");
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      max_tokens: 700
    });
    const text = completion.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string") {
      return res.status(502).json({ message: `${provider === "groq" ? "Groq" : "xAI Grok"} returned an empty response. Please try again.` });
    }
    let savedConversation = null;
    const newMessages = [{ role: "user", content: prompt, mode, createdAt: new Date() }, { role: "assistant", content: text.slice(0, 10000), mode, createdAt: new Date() }];
    if (hasConversationId) {
      // Atomic update with the owner in the DB filter: cannot append to a chat that is not the caller's.
      savedConversation = await AIConversation.findOneAndUpdate(ownedAIFilter(rawConversationId, req.user), { $push: { messages: { $each: newMessages } } }, { new: true });
      if (!savedConversation) return res.status(404).json({ message: "AI conversation not found. Start a new AI chat." });
    } else {
      const title = prompt.replace(/\s+/g, " ").slice(0, 64) || "New AI chat";
      savedConversation = await AIConversation.create({ owner: req.user._id, title, messages: newMessages });
    }
    res.json({ text, model: completion.model || model, provider, conversationId: savedConversation._id, conversationTitle: savedConversation.title, messages: savedConversation.messages });
  } catch (e) {
    console.error(`${provider === "groq" ? "Groq" : "xAI Grok"} AI error:`, e?.status || "", e?.message || e);
    const message = e?.status === 401 || e?.status === 403
      ? `${provider === "groq" ? "Groq" : "xAI"} rejected the API key or access. Check the matching API key in server/.env.`
      : e?.status === 404
      ? `AI model or endpoint was not found. Check AI_PROVIDER, base URL, and AI_MODEL in server/.env.`
      : e?.status === 429
      ? `${provider === "groq" ? "Groq" : "xAI"} rate or usage limit reached. Check your provider console and try again later.`
      : `AI request failed (${e?.status || "network error"}). Check provider key, model, usage limits, and backend logs.`;
    res.status(502).json({ message });
  }
}));

// ---- LinkedIn Explorer -----------------------------------------------------------------------
// Saved LinkedIn links are private to their owner (owner is part of every DB filter). The server never contacts
// linkedin.com, never scrapes, and never tries to bypass LinkedIn's login wall: it only validates and stores URLs.
const LINKEDIN_NOT_FOUND = { message: "Saved LinkedIn link not found." };
const LINKEDIN_MAX_LINKS = 200;
const cleanText = (value, max) => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
app.post("/api/linkedin/preview", requireAuth, noStore, asyncHandler(async (req, res) => {
  const parsed = parseLinkedInUrl(req.body?.url);
  const saved = await LinkedInLink.findOne({ owner: req.user._id, url: parsed.url }).select("_id").lean();
  res.json({ ...parsed, savedId: saved?._id || null });
}));
app.get("/api/linkedin/links", requireAuth, noStore, asyncHandler(async (req, res) => {
  res.json(await LinkedInLink.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(LINKEDIN_MAX_LINKS).lean());
}));
app.post("/api/linkedin/links", requireAuth, noStore, asyncHandler(async (req, res) => {
  const parsed = parseLinkedInUrl(req.body?.url);
  const title = cleanText(req.body?.title, 120) || parsed.suggestedTitle;
  const note = cleanText(req.body?.note, 500);
  if (await LinkedInLink.countDocuments({ owner: req.user._id }) >= LINKEDIN_MAX_LINKS) return res.status(409).json({ message: `You can save up to ${LINKEDIN_MAX_LINKS} LinkedIn links. Remove some first.` });
  try {
    const link = await LinkedInLink.create({ owner: req.user._id, url: parsed.url, kind: parsed.kind, handle: parsed.handle, title, note });
    res.status(201).json(link);
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: "You already saved this LinkedIn link." });
    throw e;
  }
}));
app.patch("/api/linkedin/links/:id", requireAuth, noStore, validObjectIdParam(), asyncHandler(async (req, res) => {
  const update = {};
  if (req.body?.title !== undefined) { const title = cleanText(req.body.title, 120); if (!title) return res.status(400).json({ message: "Title cannot be empty." }); update.title = title; }
  if (req.body?.note !== undefined) update.note = cleanText(req.body.note, 500);
  if (!Object.keys(update).length) return res.status(400).json({ message: "Nothing to update." });
  const link = await LinkedInLink.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { $set: update }, { new: true }).lean();
  if (!link) return res.status(404).json(LINKEDIN_NOT_FOUND);
  res.json(link);
}));
app.delete("/api/linkedin/links/:id", requireAuth, noStore, validObjectIdParam(), asyncHandler(async (req, res) => {
  const result = await LinkedInLink.deleteOne({ _id: req.params.id, owner: req.user._id });
  if (!result.deletedCount) return res.status(404).json(LINKEDIN_NOT_FOUND);
  res.json({ ok: true });
}));

app.use((err, _req, res, _next) => {
  if (res.headersSent) return;
  if (err?.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON request body." });
  if (err?.message === "Origin is not allowed by CORS") return res.status(403).json({ message: "This frontend origin is not allowed. Update CLIENT_URL on the backend." });
  if (Number.isInteger(err?.statusCode) && err.statusCode >= 400 && err.statusCode <= 599) return res.status(err.statusCode).json({ message: err.message || "Request failed." });
  console.error("Unhandled request error:", err?.message || err);
  res.status(500).json({ message: "Unexpected server error." });
});

function publicUser(user) {
  return { _id: user._id, name: user.name, phone: user.phone || "", email: user.email || "", avatar: user.avatar || "", about: user.about || "Available", lastSeen: user.lastSeen, privacy: user.privacy || { lastSeen: "everyone", profilePhoto: "everyone", readReceipts: true }, preferences: user.preferences || { theme: "navy-blue", wallpaper: "", accent: "#5B9DFF", notifications: true } };
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("_id name");
    if (!user) return next(new Error("User not found"));
    socket.user = user;
    next();
  } catch { next(new Error("Invalid socket token")); }
});

io.on("connection", socket => {
  const uid = socket.user._id.toString();
  socket.join(`user:${uid}`);
  socket.broadcast.emit("presence:online", { userId: uid });

  socket.on("conversation:join", async ({ conversationId } = {}) => {
    if (!mongoose.isValidObjectId(conversationId)) return;
    const conversation = await Conversation.findOne({ _id: conversationId, members: socket.user._id }).select("_id");
    if (conversation) socket.join(`conversation:${conversationId}`);
  });

  socket.on("message:send", async ({ conversationId, text, replyTo, forwarded, attachment } = {}, callback = () => {}) => {
    try {
      const body = String(text || "").trim();
      const attachmentUrl = typeof attachment?.url === "string" ? attachment.url : "";
      const attachmentName = String(attachment?.fileName || "").slice(0, 180);
      const attachmentMime = String(attachment?.mimeType || "").slice(0, 100);
      const attachmentSize = Number(attachment?.fileSize || 0);
      if (!mongoose.isValidObjectId(conversationId) || (!body && !attachmentUrl) || body.length > 5000) return callback({ error: "Add a message or attachment before sending." });
      if (attachmentUrl && !/^https?:\/\/[^/]+\/uploads\/[a-f0-9-]+\.[a-z0-9]+$/i.test(attachmentUrl)) return callback({ error: "Invalid attachment URL." });
      const conversation = await Conversation.findOne({ _id: conversationId, members: socket.user._id });
      if (!conversation) return callback({ error: "Conversation not found." });
      if (!conversation.isGroup) { const recipientId = conversation.members.find(id => String(id) !== uid); const recipient = await User.findById(recipientId).select("blockedUsers"); const sender = await User.findById(socket.user._id).select("blockedUsers"); if (recipient?.blockedUsers.some(id => String(id) === uid) || sender?.blockedUsers.some(id => String(id) === String(recipientId))) return callback({ error: "Messaging is unavailable because this contact is blocked." }); }
      const replyId = mongoose.isValidObjectId(replyTo) ? replyTo : null;
      const mimeKind = attachmentMime.startsWith("image/") ? "image" : attachmentUrl ? "file" : "text";
      const message = await Message.create({ conversation: conversation._id, sender: socket.user._id, text: body, kind: mimeKind, fileUrl: attachmentUrl, fileName: attachmentName, mimeType: attachmentMime, fileSize: attachmentSize, readBy: [socket.user._id], replyTo: replyId, forwarded: Boolean(forwarded), expiresAt: conversation.disappearingAfter ? new Date(Date.now() + conversation.disappearingAfter * 1000) : null });
      conversation.lastMessage = message._id;
      conversation.updatedAt = new Date();
      await conversation.save();
      const populated = await Message.findById(message._id).populate("sender", "_id name avatar").populate("reactions.user", "_id name");
      io.to(`conversation:${conversationId}`).emit("message:new", populated);
      for (const memberId of conversation.members) io.to(`user:${memberId}`).emit("conversation:updated", { conversationId });
      callback({ message: populated });
    } catch { callback({ error: "Could not send message." }); }
  });

  socket.on("typing:set", async ({ conversationId, isTyping } = {}) => {
    if (mongoose.isValidObjectId(conversationId)) {
      const allowed = await Conversation.exists({ _id: conversationId, members: socket.user._id });
      if (allowed) socket.to(`conversation:${conversationId}`).emit("typing:changed", { conversationId, userId: uid, isTyping: Boolean(isTyping) });
    }
  });

  // WebRTC signaling is relayed only to a verified member of the same conversation.
  socket.on("call:signal", async ({ conversationId, targetUserId, signal, callType } = {}) => {
    if (!mongoose.isValidObjectId(conversationId) || !mongoose.isValidObjectId(targetUserId) || !["audio", "video"].includes(callType)) return;
    const allowed = await Conversation.exists({ _id: conversationId, members: { $all: [socket.user._id, targetUserId] } });
    if (!allowed) return;
    io.to(`user:${targetUserId}`).emit("call:signal", { conversationId, fromUserId: uid, fromName: socket.user.name, signal, callType });
  });

  socket.on("disconnect", async () => {
    await User.findByIdAndUpdate(socket.user._id, { lastSeen: new Date() }).catch(() => {});
    socket.broadcast.emit("presence:offline", { userId: uid, lastSeen: new Date() });
  });
});

// Scheduled-message worker. Pending messages are persisted in MongoDB and delivered after restart.
setInterval(async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const due = await Message.find({ scheduledAt: { $lte: new Date(), $ne: null }, deliveredAt: null }).limit(100);
    for (const message of due) {
      const claimed = await Message.findOneAndUpdate({ _id: message._id, deliveredAt: null }, { $set: { deliveredAt: new Date(), scheduledAt: null } }, { new: true });
      if (!claimed) continue;
      const conversation = await Conversation.findById(claimed.conversation); if (!conversation) continue;
      if (conversation.disappearingAfter) claimed.expiresAt = new Date(Date.now() + conversation.disappearingAfter * 1000);
      await claimed.save(); conversation.lastMessage = claimed._id; conversation.updatedAt = new Date(); await conversation.save();
      const populated = await Message.findById(claimed._id).populate("sender", "_id name avatar").populate("reactions.user", "_id name");
      io.to(`conversation:${conversation._id}`).emit("message:new", populated); for (const memberId of conversation.members) io.to(`user:${memberId}`).emit("conversation:updated", { conversationId: conversation._id });
    }
  } catch (error) { console.error("Scheduled message worker failed:", error?.message || error); }
}, 5000).unref();

const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("Configuration error: JWT_SECRET must be set to a random secret of at least 32 characters in server/.env");
  process.exit(1);
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("Configuration error: PORT must be a valid TCP port.");
  process.exit(1);
}

async function prepareUserIndexes() {
  // Older versions required email and created a non-sparse unique index. New phone-only
  // accounts need email to be optional, so safely migrate that index before accepting traffic.
  await User.createCollection().catch(err => { if (err?.codeName !== "NamespaceExists" && err?.code !== 48) throw err; });
  const indexes = await User.collection.indexes();
  const emailIndex = indexes.find(index => index.name === "email_1");
  if (emailIndex?.unique && !emailIndex.sparse) {
    await User.collection.dropIndex("email_1");
  }
  await User.collection.createIndex({ email: 1 }, { unique: true, sparse: true, name: "email_1" });
  await User.collection.createIndex({ phone: 1 }, { unique: true, sparse: true, name: "phone_1" });
}

// Start HTTP immediately so the frontend can reach /api/health even if MongoDB
// credentials, Atlas network access, or DNS are not configured yet.
server.listen(port, () => {
  console.log(`ChatWave API + Socket.IO listening on port ${port}`);
  connectDatabase();
});

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chatwave", {
      serverSelectionTimeoutMS: 10000,
      autoIndex: false
    });
    await prepareUserIndexes();
    console.log("MongoDB connected and indexes checked");
  } catch (err) {
    console.error("MongoDB connection failed:", err?.message || err);
    if (err?.message?.includes("querySrv ECONNREFUSED") || err?.code === "ECONNREFUSED") {
      console.error("Check DNS/network access and that MongoDB is running. For Atlas, allow your current IP in Network Access.");
      console.error("If SRV DNS is blocked, optionally set DNS_SERVERS=8.8.8.8,1.1.1.1 in server/.env.");
    } else if (err?.message?.includes("Authentication failed") || err?.code === 18) {
      console.error("MongoDB authentication failed. Check the database username/password in MONGODB_URI and URL-encode special characters.");
    }
    console.error("API stays online for /api/health and will retry MongoDB in 10 seconds.");
    setTimeout(connectDatabase, 10000).unref();
  }
}
