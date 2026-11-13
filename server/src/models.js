import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  // Email remains optional for backwards compatibility; phone is the primary identity for new accounts.
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true, index: true },
  phoneVerifiedAt: { type: Date, default: null },
  passwordHash: { type: String, required: true },
  avatar: { type: String, default: "" },
  about: { type: String, default: "Available", maxlength: 140 },
  lastSeen: { type: Date, default: Date.now },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  privacy: { lastSeen: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" }, profilePhoto: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" }, readReceipts: { type: Boolean, default: true } },
  preferences: { theme: { type: String, enum: ["navy-blue", "light", "midnight"], default: "navy-blue" }, wallpaper: { type: String, default: "" }, accent: { type: String, default: "#5B9DFF" }, notifications: { type: Boolean, default: true } }
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, default: "", maxlength: 5000 },
  kind: { type: String, enum: ["text", "image", "file", "system"], default: "text" },
  fileUrl: { type: String, default: "" },
  fileName: { type: String, default: "" },
  mimeType: { type: String, default: "" },
  fileSize: { type: Number, default: 0 },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  clearedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
  editedAt: { type: Date, default: null },
  deletedForEveryone: { type: Boolean, default: false },
  forwarded: { type: Boolean, default: false },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, emoji: { type: String, maxlength: 16 } }],
  starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  scheduledAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null, index: true }
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  isGroup: { type: Boolean, default: false },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  description: { type: String, default: "", maxlength: 500 },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  disappearingAfter: { type: Number, enum: [0, 86400, 604800, 7776000], default: 0 }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
const statusSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  text: { type: String, default: "", maxlength: 700 },
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, default: "" },
  background: { type: String, default: "#075e54" },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), index: { expires: 0 } }
}, { timestamps: true });

export const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
export const Status = mongoose.models.Status || mongoose.model("Status", statusSchema);

const pollSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  question: { type: String, required: true, maxlength: 240 },
  options: [{ label: { type: String, maxlength: 100 }, votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] }],
  multiple: { type: Boolean, default: false },
  closed: { type: Boolean, default: false }
}, { timestamps: true });

const eventSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, maxlength: 120 },
  description: { type: String, maxlength: 500, default: "" },
  startsAt: { type: Date, required: true },
  attendees: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, response: { type: String, enum: ["yes", "no", "maybe"] } }]
}, { timestamps: true });

const reportSchema = new mongoose.Schema({ reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, reason: { type: String, maxlength: 500, default: "" }, status: { type: String, enum: ["open", "reviewed", "closed"], default: "open" } }, { timestamps: true });
export const Poll = mongoose.models.Poll || mongoose.model("Poll", pollSchema);
export const ChatEvent = mongoose.models.ChatEvent || mongoose.model("ChatEvent", eventSchema);
export const UserReport = mongoose.models.UserReport || mongoose.model("UserReport", reportSchema);

const aiConversationSchema = new mongoose.Schema({
  // Ownership is fixed at creation: `immutable` makes Mongoose ignore any later attempt to reassign a chat to another user.
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true, immutable: true },
  title: { type: String, default: "New AI chat", maxlength: 120 },
  messages: [{ role: { type: String, enum: ["user", "assistant"], required: true }, content: { type: String, required: true, maxlength: 10000 }, mode: { type: String, default: "answer" }, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true });

aiConversationSchema.index({ owner: 1, updatedAt: -1 });
export const AIConversation = mongoose.models.AIConversation || mongoose.model("AIConversation", aiConversationSchema);

const backupSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  label: { type: String, default: "ChatWave backup", maxlength: 100 },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  bytes: { type: Number, default: 0 }
}, { timestamps: true });
backupSchema.index({ owner: 1, createdAt: -1 });
export const ChatBackup = mongoose.models.ChatBackup || mongoose.model("ChatBackup", backupSchema);


const instagramConnectionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  instagramUserId: { type: String, required: true },
  username: { type: String, required: true },
  profile: { type: mongoose.Schema.Types.Mixed, default: {} },
  tokenCiphertext: { type: String, required: true },
  tokenIv: { type: String, required: true },
  tokenAuthTag: { type: String, required: true },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });
export const InstagramConnection = mongoose.models.InstagramConnection || mongoose.model("InstagramConnection", instagramConnectionSchema);


// OAuth state is persisted so login survives server restarts and multi-instance deployments.
const instagramOAuthStateSchema = new mongoose.Schema({
  stateHash: { type: String, required: true, unique: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });
export const InstagramOAuthState = mongoose.models.InstagramOAuthState || mongoose.model("InstagramOAuthState", instagramOAuthStateSchema);


const resumeSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  fileUrl: { type: String, required: true, maxlength: 1000 },
  fileName: { type: String, required: true, maxlength: 180 },
  mimeType: { type: String, default: "application/pdf", maxlength: 120 },
  fileSize: { type: Number, default: 0 }
}, { timestamps: true });
resumeSchema.index({ owner: 1, category: 1, createdAt: -1 });
export const Resume = mongoose.models.Resume || mongoose.model("Resume", resumeSchema);


// Saved LinkedIn profile/company links. Only the URL the user typed (normalised) and their own notes are stored;
// nothing is scraped from LinkedIn.
const linkedinLinkSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true, immutable: true },
  url: { type: String, required: true, maxlength: 300 },
  kind: { type: String, enum: ["profile", "company", "school"], default: "profile" },
  handle: { type: String, required: true, maxlength: 120 },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  note: { type: String, default: "", trim: true, maxlength: 500 }
}, { timestamps: true });
linkedinLinkSchema.index({ owner: 1, url: 1 }, { unique: true });
linkedinLinkSchema.index({ owner: 1, createdAt: -1 });
export const LinkedInLink = mongoose.models.LinkedInLink || mongoose.model("LinkedInLink", linkedinLinkSchema);
