import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { MessageCircle, Search, Plus, Send, Paperclip, Smile, Video, Phone, MoreVertical, Bot, LogOut, Moon, Users, CheckCheck, Sparkles, X, Mic, MicOff, VideoOff, PhoneOff, LoaderCircle, Menu, Camera, FileText, Download, CircleUserRound, Settings, UserRoundPlus, Mail, Volume2, VolumeX, MonitorUp, MonitorOff, UserRound, ShieldCheck, Bell, MessageSquare, Keyboard, CircleHelp, ChevronRight, Save, Palette, Github, Instagram, Linkedin, Star, GitFork, Folder, FileCode2, ArrowUpRight, ExternalLink, ChevronDown, Link2, FileAudio, FileVideo } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SOCKET = import.meta.env.VITE_SOCKET_URL || API;
const mediaSource = (value="") => { if (!value) return ""; if (/^https?:\/\//i.test(value)) { try { const u=new URL(value); if (["localhost","127.0.0.1"].includes(u.hostname)) return `${API}${u.pathname}${u.search}`; return value; } catch { return value; } } return `${API}${value.startsWith("/")?value:`/${value}`}`; };
const initials = (name="U") => name.split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase();
const palette = ["#315b50","#66518a","#8b5d3b","#3c6580","#7b4659","#526b37"];
const EMOJI_GROUPS = [
  {name:"Smileys",items:"😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 🙂‍↕️ 😏 😒 🙂‍↔️ 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🫡 🤫 🫠 🤥 😶 😶‍🌫️ 😐 😑 😬 🫨 🫥 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 😵‍💫 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃"},
  {name:"Gestures",items:"👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦"},
  {name:"Hearts",items:"❤️ 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ♥️ 🫶 💌 💋 💯 💢 💥 💫 💦 💨 🕳️ 💣 💬 👁️‍🗨️ 🗨️ 🗯️ 💭 💤"},
  {name:"Animals",items:"🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🫎 🫏 🐝 🪱 🦋 🐌 🐞 🐜 🪰 🦟 🪲 🪳 🦗 🕷️ 🕸️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🪼 🐠 🐟 🐡 🐬 🦈 🐳 🐋 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🦮 🐕‍🦺 🐩 🐈 🐈‍⬛ 🪽 🪿 🦃 🦤 🦚 🦜 🦢 🦩 🕊️ 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿️ 🦔"},
  {name:"Food",items:"🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🫒 🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🍄 🥜 🫘 🌰 🍞 🥐 🥖 🫓 🥨 🥯 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🫔 🥙 🧆 🥚 🍳 🥘 🍲 🫕 🥣 🥗 🍿 🧈 🧂 🥫 🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍠 🍢 🍣 🍤 🍥 🥮 🍡 🥟 🥠 🥡 🦪 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🫖 🍵 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🧋 🥤 🧃 🧊"},
  {name:"Travel",items:"🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🛺 🚲 🛴 🛹 🛼 🚏 🛣️ 🛤️ ⛽ 🛞 🚨 🚥 🚦 🛑 🚧 ⚓ 🛟 ⛵ 🛶 🚤 🛳️ ⛴️ 🛥️ 🚢 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚁 🚟 🚠 🚡 🛰️ 🚀 🛸 🌍 🌎 🌏 🌐 🗺️ 🧭 🏔️ ⛰️ 🌋 🗻 🏕️ 🏖️ 🏜️ 🏝️ 🏞️ 🏟️ 🏛️ 🏗️ 🧱 🏘️ 🏚️ 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗼 🗽 ⛪ 🕌 🛕 🕍 ⛩️ 🕋 ⛲ 🌁 🌃 🌄 🌅 🌆 🌇 🌉 🌌"},
  {name:"Activities",items:"⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🏋️ 🤼 🤸 ⛹️ 🤺 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🪈 🎲 ♟️ 🎯 🎳 🎮 🎰 🧩"},
  {name:"Objects",items:"⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 🧾 💎 ⚖️ 🪜 🧰 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🪤 🧱 🪞 🪟 🛏️ 🛋️ 🪑 🚪 🪠 🚿 🛁 🪥 🪒 🧴 🧷 🧹 🧺 🧻 🪣 🧼 🫧 🪮 🧽 🧸 🪆 🖼️ 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🎎 🏮 🎐 🧧 ✉️ 📩 📨 📧 💌 📥 📤 📦 🏷️ 📪 📫 📬 📭 📮 📯 📜 📃 📄 📑 🧾 📊 📈 📉 🗒️ 🗓️ 📆 📅 🗑️ 📇 🗃️ 🗳️ 🗄️ 📋 📁 📂 🗂️ 🗞️ 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇️ ✂️ 📐 📏 🧮 📌 📍 🧪 🧫 🧬 🔬 🔭 📡 💉 🩸 💊 🩹 🩺 🚪 🛎️ 🔑 🗝️ 🔒 🔓 🔏 🔐 🛡️ 🔫 💣 🧨 🪓 🪃 🪚 🔪 🗡️ ⚔️ 🛠️ 🧲 🪝 🧿 🪬 🪧 🪪"},
  {name:"Symbols",items:"❤️‍🔥 ♻️ ✅ ☑️ ✔️ ❌ ❎ ➕ ➖ ➗ ✖️ 💲 💱 ™️ ©️ ®️ 〰️ ➰ ➿ 🔱 ⚜️ 🔰 ⭕ 🛑 ⛔ 🚫 💯 🔞 🔝 🔛 🔜 🔚 🔙 🔃 🔄 🔁 🔂 ▶️ ⏸️ ⏯️ ⏹️ ⏺️ ⏭️ ⏮️ ⏩ ⏪ 🔀 🔼 🔽 ⬆️ ⬇️ ⬅️ ➡️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ 🔄 🔙 🔚 🔛 🔜 🔝 🆗 🆕 🆙 🆒 🆓 🆖 🆘 🆔 🆚 🈁 🈂️ 🈷️ 🈶 🈯 🉐 🈹 🈚 🈲 🉑 🈸 🈴 🈳 ㊗️ ㊙️ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ⭐ 🌟 ✨ ⚡ ☀️ 🌙 ☁️ 🌈 ☔ ❄️ 🔥 💧 🌊"}
];
const EMOJIS = EMOJI_GROUPS.flatMap(g=>g.items.split(" ").map(emoji=>({emoji,group:g.name})));
function formatAudioTime(seconds) { if(!Number.isFinite(seconds)||seconds<0)return "0:00";const m=Math.floor(seconds/60);const s=Math.floor(seconds%60);return `${m}:${String(s).padStart(2,"0")}`; }
function VoicePlayer({src,fileName}) {
  const audioRef=useRef(null);
  const [playing,setPlaying]=useState(false),[duration,setDuration]=useState(0),[current,setCurrent]=useState(0),[failed,setFailed]=useState(false);
  useEffect(()=>{const a=audioRef.current;if(!a)return;const loaded=()=>{setDuration(Number.isFinite(a.duration)?a.duration:0);setFailed(false);};const time=()=>setCurrent(a.currentTime||0);const ended=()=>{setPlaying(false);setCurrent(0);};const error=()=>setFailed(true);a.addEventListener("loadedmetadata",loaded);a.addEventListener("durationchange",loaded);a.addEventListener("timeupdate",time);a.addEventListener("ended",ended);a.addEventListener("error",error);a.load();return()=>{a.removeEventListener("loadedmetadata",loaded);a.removeEventListener("durationchange",loaded);a.removeEventListener("timeupdate",time);a.removeEventListener("ended",ended);a.removeEventListener("error",error);};},[src]);
  async function toggle(){const a=audioRef.current;if(!a)return;if(a.paused){try{await a.play();setPlaying(true);}catch{setFailed(true);}}else{a.pause();setPlaying(false);}}
  const progress=duration>0?Math.min(100,current/duration*100):0;

  return <div className={`voice-player ${failed?"voice-player-error":""}`}><audio ref={audioRef} src={src} preload="metadata"/><button className="voice-play" type="button" onClick={toggle} aria-label={playing?"Pause voice message":"Play voice message"}>{playing?<span className="voice-pause-symbol">Ⅱ</span>:<span className="voice-play-symbol">▶</span>}</button><div className="voice-player-main"><div className="voice-wave" role="presentation">{Array.from({length: thirtyFive},(_,i)=><i key={i} style={{height:`${[8,13,19,11,22,15,26,12,18,9,24,15,20,10,27,14,19,8,22,13,17,25,11,20,9,16,23,12,18,7,21,14,24,10,17][i]}px`,opacity:i<(progress/100*35)?1:.42}}/>)}</div><div className="voice-player-meta"><span>{failed?"Can't play audio":formatAudioTime(current)}</span><span>{duration?formatAudioTime(duration):"Voice message"}</span></div><input aria-label="Audio progress" className="voice-progress" type="range" min="0" max={duration||1} step="0.1" value={Math.min(current,duration||1)} onChange={e=>{if(audioRef.current){audioRef.current.currentTime=Number(e.target.value);setCurrent(Number(e.target.value));}}} disabled={!duration||failed}/></div><a className="voice-download" href={src} download={fileName||"voice-message"} title="Download audio"><Download size={15}/></a></div>;
}
const thirtyFive=35;
function Avatar({ user, size=42, online=false }) {
  return <div className="avatar-wrap"><div className="avatar" style={{width:size,height:size,background:palette[(user?.name?.charCodeAt(0)||0)%palette.length]}}>{user?.avatar ? <img src={user.avatar} alt="" /> : initials(user?.name)}</div>{online&&<span className="online-dot"/>}</div>;
}
function timeLabel(value) { if(!value) return ""; return new Date(value).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); }

export default function App() {
  const [token,setToken] = useState(localStorage.getItem("cw_token")||"");
  const [me,setMe] = useState(()=>{try{return JSON.parse(localStorage.getItem("cw_user")||"null");}catch{return null;}});
  const [authMode,setAuthMode] = useState("login");
  const [auth,setAuth] = useState({name:"",phone:"+91",password:"",code:""});
  const [signupStage,setSignupStage] = useState("phone");
  const [signupTicket,setSignupTicket] = useState("");
  const [authBusy,setAuthBusy] = useState(false);
  const [authError,setAuthError] = useState("");
  const [authNotice,setAuthNotice] = useState("");
  const [users,setUsers] = useState([]);
  const [conversations,setConversations] = useState([]);
  const [active,setActive] = useState(null);
  const [messages,setMessages] = useState([]);
  const [draft,setDraft] = useState("");
  const [query,setQuery] = useState("");
  const [chatFilter,setChatFilter] = useState("all");
  const [replyTo,setReplyTo] = useState(null);
  const [forwarding,setForwarding] = useState(false);
  const [statuses,setStatuses] = useState([]);
  const [polls,setPolls] = useState([]);
  const [events,setEvents] = useState([]);
  const [statusOpen,setStatusOpen] = useState(false);
  const [statusDraft,setStatusDraft] = useState("");
  const [statusFile,setStatusFile] = useState(null);
  const [viewingStatus,setViewingStatus] = useState(null);
  const [privacyOpen,setPrivacyOpen] = useState(false);
  const [emojiOpen,setEmojiOpen] = useState(false);
  const [emojiQuery,setEmojiQuery] = useState("");
  const [emojiGroup,setEmojiGroup] = useState("Smileys");
  const [settingsOpen,setSettingsOpen] = useState(false);
  const [chatMenuOpen,setChatMenuOpen] = useState(false);
  const [timerMenuOpen,setTimerMenuOpen] = useState(false);
  const [privacyDraft,setPrivacyDraft] = useState({lastSeen:me?.privacy?.lastSeen||"everyone",readReceipts:me?.privacy?.readReceipts!==false});
  const statusInput = useRef(null);
  const [darkMode,setDarkMode] = useState(false);
  const [globalSearchOpen,setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery,setGlobalSearchQuery] = useState("");
  const [globalSearchResults,setGlobalSearchResults] = useState([]);
  const [globalSearchBusy,setGlobalSearchBusy] = useState(false);
  const [pendingCount,setPendingCount] = useState(0);
  const [messageSearch,setMessageSearch] = useState("");
  const [socket,setSocket] = useState(null);
  const [online,setOnline] = useState([]);
  const [typing,setTyping] = useState(false);
  const [aiOpen,setAiOpen] = useState(false);
  const [aiPrompt,setAiPrompt] = useState("");
  const [aiResult,setAiResult] = useState("");
  const [aiBusy,setAiBusy] = useState(false);
  const [aiConversations,setAiConversations] = useState([]);
  const [aiConversationId,setAiConversationId] = useState("");
  const [aiThread,setAiThread] = useState([]);
  const [aiHistoryOpen,setAiHistoryOpen] = useState(false);
  const [call,setCall] = useState(null);
  const [callStatus,setCallStatus] = useState("");
  const [callHistory,setCallHistory] = useState(()=>{try{return JSON.parse(localStorage.getItem(`cw_call_history_${me?._id||"guest"}`)||"[]");}catch{return [];}});
  const [speakerEnabled,setSpeakerEnabled] = useState(true);
  const [screenSharing,setScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);
  const [mobileSidebar,setMobileSidebar] = useState(()=>typeof window!=="undefined"&&window.matchMedia("(max-width:650px)").matches);
  const [activeSection,setActiveSection] = useState("chats");
  const [resumes,setResumes] = useState([]);
  const [resumeTitle,setResumeTitle] = useState("");
  const [resumeCategory,setResumeCategory] = useState("Full Stack Developer");
  const [resumeFile,setResumeFile] = useState(null);
  const [resumeBusy,setResumeBusy] = useState(false);
  const resumeInput = useRef(null);
  const [groupWizard,setGroupWizard] = useState(null);
  const [settingsTab,setSettingsTab] = useState("profile");
  // Built-in social explorers: GitHub's public REST API, Instagram public embeds, and authorized account media.
  const [githubQuery,setGithubQuery] = useState("");
  const [githubProfile,setGithubProfile] = useState(null);
  const [githubRepos,setGithubRepos] = useState([]);
  const [githubRepo,setGithubRepo] = useState(null);
  const [githubPath,setGithubPath] = useState("");
  const [githubFiles,setGithubFiles] = useState([]);
  const [githubReadme,setGithubReadme] = useState("");
  const [githubCode,setGithubCode] = useState(null);
  const [githubBusy,setGithubBusy] = useState(false);
  const [githubError,setGithubError] = useState("");
  const [instagramInput,setInstagramInput] = useState("");
  const [instagramItem,setInstagramItem] = useState(null);
  const [instagramPublicProfile,setInstagramPublicProfile] = useState(null);
  const [instagramEmbedState,setInstagramEmbedState] = useState("idle");
  const [instagramError,setInstagramError] = useState("");
  const [instagramProfile,setInstagramProfile] = useState(null);
  const [instagramMedia,setInstagramMedia] = useState([]);
  const [instagramCursor,setInstagramCursor] = useState("");
  const [instagramHasMore,setInstagramHasMore] = useState(false);
  const [instagramAccountBusy,setInstagramAccountBusy] = useState(false);
  const [instagramTab,setInstagramTab] = useState("ALL");
  const [instagramDownloadId,setInstagramDownloadId] = useState("");
  // LinkedIn Explorer: link validation + private saved links only. No scraping and no LinkedIn login bypass.
  const [linkedinInput,setLinkedinInput] = useState("");
  const [linkedinPreview,setLinkedinPreview] = useState(null);
  const [linkedinNote,setLinkedinNote] = useState("");
  const [linkedinLinks,setLinkedinLinks] = useState([]);
  const [linkedinBusy,setLinkedinBusy] = useState(false);
  const [linkedinError,setLinkedinError] = useState("");
  const [mediaInput,setMediaInput] = useState("");
  const [mediaPreview,setMediaPreview] = useState(null);
  const [mediaError,setMediaError] = useState("");
  const [mediaBusy,setMediaBusy] = useState(false);
  const [chatPrefs,setChatPrefs] = useState(()=>{try{return {enterToSend:true,mediaVisibility:true,fontSize:14,wallpaper:"default",defaultDisappearing:0,...JSON.parse(localStorage.getItem("cw_chat_prefs")||"{}")};}catch{return {enterToSend:true,mediaVisibility:true,fontSize:14,wallpaper:"default",defaultDisappearing:0};}});
  const [toast,setToast] = useState("");
  const [dialog,setDialog] = useState(null);
  const dialogResolver = useRef(null);
  const [uploading,setUploading] = useState(false);
  const [recording,setRecording] = useState(false);
  const [recordSeconds,setRecordSeconds] = useState(0);
  const [voiceDraft,setVoiceDraft] = useState(null);
  const [cameraOpen,setCameraOpen] = useState(false);
  const [cameraRecording,setCameraRecording] = useState(false);
  const [cameraSeconds,setCameraSeconds] = useState(0);
  const cameraVideoRef = useRef(null), cameraStreamRef = useRef(null), cameraRecorderRef = useRef(null), cameraChunksRef = useRef([]), cameraTimerRef = useRef(null);
  const profileInput = useRef(null), attachmentInput = useRef(null), mediaRecorderRef = useRef(null), recordChunksRef = useRef([]), recordTimerRef = useRef(null), recordSecondsRef = useRef(0);
  const localVideo = useRef(null), remoteVideo = useRef(null), remoteAudio = useRef(null), pcRef = useRef(null), localStreamRef = useRef(null), messagesEnd = useRef(null), typingTimer = useRef(null), callRef = useRef(null), socketRef = useRef(null), activeIdRef = useRef(null), remoteStreamRef = useRef(null), pendingCandidatesRef = useRef([]);
  useEffect(()=>{callRef.current=call;if(localVideo.current&&localStreamRef.current)localVideo.current.srcObject=localStreamRef.current;if(remoteStreamRef.current){if(remoteVideo.current)remoteVideo.current.srcObject=remoteStreamRef.current;if(remoteAudio.current)remoteAudio.current.srcObject=remoteStreamRef.current;}},[call]);
  const activeId = active?._id;
  useEffect(()=>{activeIdRef.current=activeId;},[activeId]);
  const activeOther = active?.members?.find(m=>m._id!==me?._id);
  const activeName = active?.isGroup ? active.title : activeOther?.name || "Conversation";
  const filteredUsers = useMemo(()=>users.filter(u=>`${u.name} ${u.phone || ""} ${u.email || ""}`.toLowerCase().includes(query.toLowerCase())),[users,query]);
  const filteredConversations = useMemo(()=>conversations.filter(c=>{
    if(chatFilter==="groups"&&!c.isGroup)return false;
    if(chatFilter==="favorites"&&!c.pinnedBy?.some(id=>String(id)===String(me?._id)))return false;
    if(chatFilter==="unread"&&(!c.lastMessage||String(c.lastMessage.sender?._id||c.lastMessage.sender)===String(me?._id)))return false;
    if(c.archivedBy?.some(id=>String(id)===String(me?._id)))return false;
    const title = c.isGroup ? c.title : c.members?.find(m=>m._id!==me?._id)?.name;
    return (title||"").toLowerCase().includes(query.toLowerCase());
  }),[conversations,query,me,chatFilter]);

  function askDialog({title="ChatWave",message="",value="",placeholder="",confirmText="Continue",type="input"}={}) {
    return new Promise(resolve=>{dialogResolver.current=resolve;setDialog({title,message,value,placeholder,confirmText,type});});
  }
  function closeDialog(result=null) { const resolve=dialogResolver.current;dialogResolver.current=null;setDialog(null);resolve?.(result); }
  async function api(path, options={}) {
    let response;
    try {
      response = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`} : {}), ...(options.headers||{}) }});
    } catch {
      throw new Error(`Cannot reach the backend at ${API}. Make sure the server is running and VITE_API_URL is correct.`);
    }
    const data = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.message||"Request failed");
    return data;
  }
  async function authRequest(path, body) {
    const response = await fetch(`${API}${path}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.message || "Authentication failed.");
    return data;
  }
  async function startPhoneVerification(e) {
    e?.preventDefault(); setAuthError(""); setAuthNotice(""); setAuthBusy(true);
    try {
      const data = await authRequest("/api/auth/otp/start", { phone: auth.phone.trim() });
      setSignupStage("otp"); setAuthNotice(data.message || "OTP sent. Check your SMS messages.");
    } catch (e) { setAuthError(e instanceof TypeError ? `Cannot reach backend at ${API}. Start the server and check VITE_API_URL.` : e.message); }
    finally { setAuthBusy(false); }
  }
  async function verifyPhoneOtp(e) {
    e?.preventDefault(); setAuthError(""); setAuthNotice(""); setAuthBusy(true);
    try {
      const data = await authRequest("/api/auth/otp/check", { phone: auth.phone.trim(), code: auth.code.trim() });
      setSignupTicket(data.signupTicket); setSignupStage("password"); setAuthError(""); setAuthNotice("");
    } catch (e) { setAuthError(e instanceof TypeError ? `Cannot reach backend at ${API}. Start the server and check VITE_API_URL.` : e.message); }
    finally { setAuthBusy(false); }
  }
  async function submitAuth(e) {
    e.preventDefault(); setAuthError(""); setAuthBusy(true);
    try {
      const data = authMode === "login"
        ? await authRequest("/api/auth/login", { phone: auth.phone.trim(), password: auth.password })
        : await authRequest("/api/auth/register", { name: auth.name.trim(), phone: auth.phone.trim(), password: auth.password, signupTicket });
      localStorage.setItem("cw_token",data.token); localStorage.setItem("cw_user",JSON.stringify(data.user)); setToken(data.token); setMe(data.user);
    } catch(e) { setAuthError(e instanceof TypeError ? `Cannot reach backend at ${API}. Start the server and check VITE_API_URL.` : e.message); }
    finally { setAuthBusy(false); }
  }
  function switchAuthMode(mode) {
    setAuthMode(mode); setSignupStage("phone"); setSignupTicket(""); setAuthError(""); setAuthNotice("");
    setAuth({name:"",phone:"+91",password:"",code:""});
  }
  function logout(){ if(socket) socket.disconnect(); localStorage.removeItem("cw_token");localStorage.removeItem("cw_user");setToken("");setMe(null);setUsers([]);setConversations([]);setMessages([]);setActive(null);setSocket(null);endCall(); }
  async function refreshData(){
    const [u,c] = await Promise.all([api("/api/users"),api("/api/conversations")]);
    setUsers(u);setConversations(c);
  }
  async function loadResumes(){try{setResumes(await api("/api/resumes"));}catch(e){setToast(e.message);}}
  async function saveResume(e){e?.preventDefault();if(!resumeFile||!resumeTitle.trim()){setToast("Enter a resume title and choose a file.");return;}if(resumeFile.size>8*1024*1024){setToast("Resume files must be 8 MB or smaller.");return;}if(!["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(resumeFile.type)){setToast("Choose a PDF, DOC or DOCX resume.");return;}try{setResumeBusy(true);const uploaded=await api("/api/uploads/file",{method:"POST",body:JSON.stringify({dataUrl:await fileToDataUrl(resumeFile),fileName:resumeFile.name})});const pathOnly=new URL(uploaded.url,API).pathname;const item=await api("/api/resumes",{method:"POST",body:JSON.stringify({title:resumeTitle,category:resumeCategory,fileUrl:pathOnly,fileName:resumeFile.name,mimeType:resumeFile.type||"application/octet-stream",fileSize:resumeFile.size})});setResumes(prev=>[item,...prev]);setResumeTitle("");setResumeFile(null);if(resumeInput.current)resumeInput.current.value="";setToast("Resume saved to your library.");}catch(err){setToast(err.message);}finally{setResumeBusy(false);}}
  async function loadLinkedInLinks(){try{setLinkedinLinks(await api("/api/linkedin/links"));}catch(e){setLinkedinError(e.message);}}
  async function previewLinkedIn(e){e?.preventDefault();setLinkedinError("");setLinkedinPreview(null);setLinkedinNote("");if(!linkedinInput.trim()){setLinkedinError("Paste a LinkedIn profile URL first.");return;}setLinkedinBusy(true);try{setLinkedinPreview(await api("/api/linkedin/preview",{method:"POST",body:JSON.stringify({url:linkedinInput})}));}catch(err){setLinkedinError(err.message);}finally{setLinkedinBusy(false);}}
  async function saveLinkedInLink(){if(!linkedinPreview||linkedinBusy)return;setLinkedinBusy(true);setLinkedinError("");try{const link=await api("/api/linkedin/links",{method:"POST",body:JSON.stringify({url:linkedinPreview.url,title:linkedinPreview.suggestedTitle,note:linkedinNote})});setLinkedinLinks(prev=>[link,...prev]);setLinkedinPreview(p=>p?{...p,savedId:link._id}:p);setToast("LinkedIn link saved.");}catch(err){setLinkedinError(err.message);}finally{setLinkedinBusy(false);}}
  async function deleteLinkedInLink(id){try{await api(`/api/linkedin/links/${id}`,{method:"DELETE"});setLinkedinLinks(prev=>prev.filter(l=>l._id!==id));setLinkedinPreview(p=>p&&p.savedId===id?{...p,savedId:null}:p);setToast("LinkedIn link removed.");}catch(err){setToast(err.message);}}
  async function editLinkedInNote(link){const note=await askDialog({title:"Edit note",message:link.title,value:link.note||"",placeholder:"Why is this profile useful?",confirmText:"Save"});if(note===null)return;try{const updated=await api(`/api/linkedin/links/${link._id}`,{method:"PATCH",body:JSON.stringify({note})});setLinkedinLinks(prev=>prev.map(l=>l._id===updated._id?updated:l));}catch(err){setToast(err.message);}}
  function openLinkedIn(url){window.open(url,"_blank","noopener,noreferrer");}
  async function copyLinkedIn(url){try{await navigator.clipboard.writeText(url);setToast("Link copied.");}catch{setToast("Could not copy the link.");}}
  async function deleteResume(id){try{await api(`/api/resumes/${id}`,{method:"DELETE"});setResumes(prev=>prev.filter(r=>r._id!==id));setToast("Resume removed from your library.");}catch(e){setToast(e.message);}}
  useEffect(()=>{setPendingCount(readPendingMessages().length);},[me?._id]);
  useEffect(()=>{if(!token||!me)return; let mounted=true; refreshData().catch(e=>{setToast(e.message);}); api("/api/statuses").then(setStatuses).catch(()=>{}); const s=io(SOCKET,{auth:{token},transports:["polling","websocket"],upgrade:true,reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:1000,reconnectionDelayMax:5000,timeout:20000});socketRef.current=s;setSocket(s);
    s.on("connect",()=>{flushPendingMessages(s);});
    s.on("presence:online",({userId})=>setOnline(prev=>prev.includes(userId)?prev:[...prev,userId]));
    s.on("presence:offline",({userId})=>setOnline(prev=>prev.filter(id=>id!==userId)));
    s.on("profile:changed",({userId,avatar,name})=>{setUsers(prev=>prev.map(u=>u._id===userId?{...u,avatar,name:name||u.name}:u));setConversations(prev=>prev.map(c=>({...c,members:c.members?.map(m=>m._id===userId?{...m,avatar,name:name||m.name}:m)})));});
    s.on("message:new",msg=>{const conversationId=typeof msg.conversation==="string"?msg.conversation:msg.conversation?._id;if(mounted && conversationId===activeIdRef.current)setMessages(prev=>prev.some(m=>m._id===msg._id)?prev:[...prev,msg]);});
    s.on("message:changed",msg=>{if(mounted)setMessages(prev=>prev.map(m=>m._id===msg._id?msg:m));});
    s.on("messages:read",payload=>{if(mounted&&payload.conversationId===activeIdRef.current)setMessages(prev=>prev.map(m=>payload.messageIds?.includes(m._id)?{...m,readBy:[...(m.readBy||[]),payload.userId]}:m));});
    s.on("status:new",status=>setStatuses(prev=>prev.some(s=>s._id===status._id)?prev:[status,...prev]));
    s.on("poll:new",poll=>setPolls(prev=>prev.some(p=>p._id===poll._id)?prev:[poll,...prev]));
    s.on("poll:changed",poll=>setPolls(prev=>prev.map(p=>p._id===poll._id?poll:p)));
    s.on("event:new",event=>setEvents(prev=>prev.some(x=>x._id===event._id)?prev:[event,...prev]));
    s.on("event:changed",event=>setEvents(prev=>prev.map(x=>x._id===event._id?event:x)));
    s.on("conversation:updated",()=>refreshData().catch(()=>{}));
    s.on("typing:changed",payload=>{if(payload.conversationId===activeIdRef.current)setTyping(payload.isTyping);});
    s.on("call:signal",handleCallSignal);
    return ()=>{mounted=false;s.disconnect();if(socketRef.current===s)socketRef.current=null;setSocket(current=>current===s?null:current);};
  },[token,me?._id]);
  useEffect(()=>{if(!activeId||!token)return;let cancelled=false;setMessages([]);setPolls([]);setEvents([]);api(`/api/conversations/${activeId}/messages`).then(data=>{if(!cancelled)setMessages(data);}).catch(e=>{if(!cancelled)setToast(e.message);});api(`/api/conversations/${activeId}/polls`).then(data=>{if(!cancelled)setPolls(data);}).catch(()=>{});api(`/api/conversations/${activeId}/events`).then(data=>{if(!cancelled)setEvents(data);}).catch(()=>{});socket?.emit("conversation:join",{conversationId:activeId});return()=>{cancelled=true;};},[activeId,token,socket]);
  useEffect(()=>{messagesEnd.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  async function openDirect(user) {
    setForwarding(false);
    try { const c=await api("/api/conversations/direct",{method:"POST",body:JSON.stringify({userId:user._id})});setConversations(prev=>prev.some(x=>x._id===c._id)?prev:[c,...prev]);setActive(c);setActiveSection("chats");setMobileSidebar(false); }
    catch(e){setToast(e.message);}
  }
  function fileToDataUrl(file) { return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(new Error("Could not read this file.")); reader.readAsDataURL(file); }); }
  async function uploadAvatar(file) {
    if(!file)return; if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setToast("Choose a JPG, PNG or WebP profile photo.");return;} if(file.size>5*1024*1024){setToast("Profile photo must be smaller than 5 MB.");return;}
    setUploading(true);try{const dataUrl=await fileToDataUrl(file);const updated=await api("/api/uploads/avatar",{method:"POST",body:JSON.stringify({dataUrl,fileName:file.name})});setMe(updated);localStorage.setItem("cw_user",JSON.stringify(updated));setUsers(prev=>prev.map(u=>u._id===updated._id?{...u,...updated}:u));setConversations(prev=>prev.map(c=>({...c,members:c.members?.map(m=>m._id===updated._id?{...m,...updated}:m)})));setToast("Profile picture updated.");}catch(e){setToast(e.message);}finally{setUploading(false);if(profileInput.current)profileInput.current.value="";}
  }
  async function uploadAttachment(file) {
    if(!file||!activeId||!socket)return false; if(file.size>8*1024*1024){setToast("Files must be smaller than 8 MB.");return false;}
    setUploading(true);try{const dataUrl=await fileToDataUrl(file);const attachment=await api("/api/uploads/file",{method:"POST",body:JSON.stringify({dataUrl,fileName:file.name})});const text=draft.trim();await new Promise((resolve,reject)=>{socket.emit("message:send",{conversationId:activeId,text,replyTo:replyTo?._id,forwarded:forwarding,attachment},response=>response?.error?reject(new Error(response.error)):resolve(response));});setDraft("");setReplyTo(null);setForwarding(false);setToast("Attachment sent.");return true;}catch(e){setToast(e.message||"Could not send attachment.");return false;}finally{setUploading(false);if(attachmentInput.current)attachmentInput.current.value="";}
  }
  async function toggleVoiceRecording() {
    if(recording){mediaRecorderRef.current?.stop();return;}
    if(!activeId||!socket){setToast("Open a chat before recording a voice message.");return;}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setToast("Voice recording requires HTTPS or localhost and a supported browser.");return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      const mime=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"].find(t=>MediaRecorder.isTypeSupported(t));
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined); mediaRecorderRef.current=recorder; recordChunksRef.current=[];
      recorder.ondataavailable=e=>{if(e.data?.size)recordChunksRef.current.push(e.data);};
      recorder.onerror=()=>{stream.getTracks().forEach(t=>t.stop());setRecording(false);clearInterval(recordTimerRef.current);setToast("Audio recording failed. Check microphone permission and try again.");};
      recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());setRecording(false);clearInterval(recordTimerRef.current);const recordedDuration=recordSecondsRef.current;recordSecondsRef.current=0;const blob=new Blob(recordChunksRef.current,{type:recorder.mimeType||"audio/webm"});recordChunksRef.current=[];if(!blob.size){setToast("No audio was recorded. Please try again.");return;}const ext=blob.type.includes("ogg")?"ogg":blob.type.includes("mp4")?"m4a":"webm";const file=new File([blob],`voice-message-${Date.now()}.${ext}`,{type:blob.type||"audio/webm"});const previewUrl=URL.createObjectURL(blob);setVoiceDraft({file,url:previewUrl,duration:recordedDuration});setRecordSeconds(0);};
      recorder.start(250);setRecording(true);setRecordSeconds(0);recordSecondsRef.current=0;recordTimerRef.current=setInterval(()=>{recordSecondsRef.current+=1;setRecordSeconds(recordSecondsRef.current);},1000);
    }catch(e){setToast(e.name==="NotAllowedError"?"Allow microphone access in your browser to record a voice message.":`Could not start microphone: ${e.message||"unknown error"}`);}
  }
  async function sendVoiceDraft(){if(!voiceDraft||uploading)return;const current=voiceDraft;const sent=await uploadAttachment(current.file);if(sent){URL.revokeObjectURL(current.url);setVoiceDraft(null);}}
  function cancelVoiceDraft(){if(voiceDraft?.url)URL.revokeObjectURL(voiceDraft.url);setVoiceDraft(null);}


  async function openCamera(){
    if(!activeId||!socket){setToast("Open a chat before taking a photo or video.");return;}
    if(!navigator.mediaDevices?.getUserMedia){setToast("Camera access requires HTTPS/localhost and a supported browser.");return;}
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"}}});cameraStreamRef.current=stream;setCameraOpen(true);setCameraRecording(false);setCameraSeconds(0);setTimeout(()=>{if(cameraVideoRef.current){cameraVideoRef.current.srcObject=stream;cameraVideoRef.current.play().catch(()=>{});}},0);}catch(e){setToast(e.name==="NotAllowedError"?"Allow camera permission to take photos or videos.":"Could not open camera: "+e.message);}
  }
  function closeCamera(){if(cameraRecorderRef.current?.state==="recording"){cameraRecorderRef.current.onstop=null;cameraRecorderRef.current.stop();}clearInterval(cameraTimerRef.current);cameraStreamRef.current?.getTracks().forEach(t=>t.stop());cameraStreamRef.current=null;cameraRecorderRef.current=null;setCameraRecording(false);setCameraSeconds(0);setCameraOpen(false);}
  async function capturePhoto(){const video=cameraVideoRef.current;if(!video||!video.videoWidth){setToast("Camera is still starting. Try again in a moment.");return;}const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext("2d").drawImage(video,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.88));if(!blob){setToast("Could not capture photo.");return;}const file=new File([blob],`chatwave-photo-${Date.now()}.jpg`,{type:"image/jpeg"});closeCamera();await uploadAttachment(file);}
  function toggleCameraVideo(){
    if(cameraRecording){cameraRecorderRef.current?.stop();return;}
    const stream=cameraStreamRef.current;if(!stream||!window.MediaRecorder){setToast("Video recording is not supported by this browser.");return;}
    const mime=["video/webm;codecs=vp8,opus","video/webm","video/mp4"].find(t=>MediaRecorder.isTypeSupported(t));
    try{const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);cameraRecorderRef.current=recorder;cameraChunksRef.current=[];recorder.ondataavailable=e=>{if(e.data?.size)cameraChunksRef.current.push(e.data);};recorder.onstop=async()=>{clearInterval(cameraTimerRef.current);const blob=new Blob(cameraChunksRef.current,{type:recorder.mimeType||"video/webm"});const ext=blob.type.includes("mp4")?"mp4":"webm";closeCamera();if(!blob.size)return;await uploadAttachment(new File([blob],`chatwave-video-${Date.now()}.${ext}`,{type:blob.type||"video/webm"}));};recorder.start(250);setCameraRecording(true);setCameraSeconds(0);cameraTimerRef.current=setInterval(()=>setCameraSeconds(v=>v+1),1000);}catch(e){setToast("Could not start video recording: "+e.message);}
  }

  function pendingStorageKey(){return `cw_pending_messages_${me?._id||"guest"}`;}
  function readPendingMessages(){try{return JSON.parse(localStorage.getItem(pendingStorageKey())||"[]");}catch{return [];}}
  function queuePendingMessage(item){const next=[...readPendingMessages(),{...item,clientId:crypto.randomUUID(),queuedAt:new Date().toISOString()}];localStorage.setItem(pendingStorageKey(),JSON.stringify(next));setPendingCount(next.length);setToast("Offline: message saved on this device and will sync when connected.");}
  function flushPendingMessages(activeSocket=socket){if(!activeSocket?.connected)return;const pending=readPendingMessages();if(!pending.length){setPendingCount(0);return;}const sendNext=(index)=>{if(index>=pending.length){localStorage.setItem(pendingStorageKey(),"[]");setPendingCount(0);setToast("Queued messages synced.");return;}const item=pending[index];activeSocket.emit("message:send",{conversationId:item.conversationId,text:item.text,replyTo:item.replyTo,forwarded:item.forwarded},response=>{if(response?.error){setToast(`Offline sync paused: ${response.error}`);const remaining=pending.slice(index);localStorage.setItem(pendingStorageKey(),JSON.stringify(remaining));setPendingCount(remaining.length);return;}sendNext(index+1);});};sendNext(0);}
  function updateChatPrefs(patch){setChatPrefs(prev=>{const next={...prev,...patch};localStorage.setItem("cw_chat_prefs",JSON.stringify(next));return next;});setToast("Chat settings saved on this device.");}
  async function sendMessage(e) {
    e?.preventDefault(); if(!draft.trim()||!activeId)return; const text=draft.trim(); const replyId=replyTo?._id; const isForwarded=forwarding; setDraft("");setReplyTo(null);setForwarding(false);
    if(!socket?.connected){queuePendingMessage({conversationId:activeId,text,replyTo:replyId,forwarded:isForwarded});return;}
    socket.emit("message:send",{conversationId:activeId,text,replyTo:replyId,forwarded:isForwarded},response=>{if(response?.error){setDraft(text);setToast(response.error);}});
    socket.emit("typing:set",{conversationId:activeId,isTyping:false});
  }
  function onDraft(value){setDraft(value);if(socket&&activeId){socket.emit("typing:set",{conversationId:activeId,isTyping:Boolean(value.trim())});clearTimeout(typingTimer.current);typingTimer.current=setTimeout(()=>socket.emit("typing:set",{conversationId:activeId,isTyping:false}),1200);}}
  async function messageAction(m, action) {
    try {
      if(action==="reply"){setReplyTo(m);return;}
      if(action==="copy"){await navigator.clipboard.writeText(m.text||"");setToast("Message copied.");return;}
      if(action==="forward"){const target=await askDialog({title:"Forward message",message:"Enter the recipient phone number",placeholder:"+919876543210"});if(!target)return;const u=users.find(x=>x.phone===target.trim());if(!u){setToast("Contact not found. Check the number and try again.");return;}const c=await api("/api/conversations/direct",{method:"POST",body:JSON.stringify({userId:u._id})});setConversations(prev=>[c,...prev.filter(x=>x._id!==c._id)]);setActive(c);setDraft(m.text||"");setForwarding(true);setToast("Message ready to forward. Press Send to confirm.");return;}
      if(action==="edit"){const text=await askDialog({title:"Edit message",message:"Update your message",value:m.text,confirmText:"Save"});if(text===null)return;const updated=await api(`/api/messages/${m._id}`,{method:"PATCH",body:JSON.stringify({text})});setMessages(prev=>prev.map(x=>x._id===updated._id?updated:x));return;}
      if(action==="delete"){if(!await askDialog({title:"Delete message",message:"Delete this message for everyone?",type:"confirm",confirmText:"Delete"}))return;await api(`/api/messages/${m._id}`,{method:"DELETE"});return;}
      if(action==="star"){const r=await api(`/api/messages/${m._id}/star`,{method:"POST",body:JSON.stringify({})});setToast(r.starred?"Message starred":"Star removed");return;}
      if(action==="react"){const emoji=await askDialog({title:"React to message",message:"Enter an emoji",value:"❤️",placeholder:"❤️ 😂 👍"});if(emoji)await api(`/api/messages/${m._id}/reaction`,{method:"POST",body:JSON.stringify({emoji})});return;}
    } catch(e){setToast(e.message);}
  }
  async function createStatus(e){e?.preventDefault();if(!statusDraft.trim()&&!statusFile)return;try{setUploading(true);let mediaUrl="",mediaType="";if(statusFile){if(statusFile.size>8*1024*1024)throw new Error("Status media must be smaller than 8 MB.");if(!["image/jpeg","image/png","image/webp","image/gif","video/mp4"].includes(statusFile.type))throw new Error("Choose a photo (JPG, PNG, WebP, GIF) or MP4 video.");const uploaded=await api("/api/uploads/file",{method:"POST",body:JSON.stringify({dataUrl:await fileToDataUrl(statusFile),fileName:statusFile.name})});mediaUrl=new URL(uploaded.url,API).pathname;mediaType=statusFile.type;}await api("/api/statuses",{method:"POST",body:JSON.stringify({text:statusDraft,background:"#075e54",mediaUrl,mediaType})});setStatusDraft("");setStatusFile(null);setStatusOpen(false);if(statusInput.current)statusInput.current.value="";setToast("Status shared for 24 hours.");}catch(e){setToast(e.message);}finally{setUploading(false);}}
  async function conversationAction(action){if(!activeId)return;try{const result=await api(`/api/conversations/${activeId}/${action}`,{method:"POST",body:JSON.stringify({})});const key=action==="archive"?"archived":action==="mute"?"muted":"pinned";setToast(result[key]?`Chat ${action}d`:`Chat ${action} removed`);if(action==="archive"){setActive(null);refreshData();}else refreshData().catch(()=>{});}catch(e){setToast(e.message);}}
  async function viewScheduled(){if(!activeId)return;try{const list=await api(`/api/conversations/${activeId}/scheduled`);if(!list.length){setToast("No scheduled messages in this chat.");return;}const chosen=await askDialog({title:"Scheduled messages",message:list.map((m,i)=>`${i+1}. ${m.text} — ${new Date(m.scheduledAt).toLocaleString()}`).join("\n")+"\nEnter a message number to cancel.",placeholder:"Message number"});if(!chosen)return;const item=list[Number(chosen)-1];if(!item){setToast("Invalid message number.");return;}await api(`/api/messages/${item._id}/schedule`,{method:"DELETE"});setToast("Scheduled message cancelled.");}catch(e){setToast(e.message);}}
  async function scheduleMessage(){if(!activeId||!draft.trim())return;const when=await askDialog({title:"Schedule message",message:"Send date/time (YYYY-MM-DDTHH:mm)",value:new Date(Date.now()+3600000).toISOString().slice(0,16),placeholder:"2026-10-30T09:00"});if(!when)return;try{await api(`/api/conversations/${activeId}/schedule`,{method:"POST",body:JSON.stringify({text:draft.trim(),scheduledAt:new Date(when).toISOString()})});setDraft("");setToast(`Message scheduled for ${new Date(when).toLocaleString()}`);}catch(e){setToast(e.message);}}
  async function manageGroupMember(){if(!active?.isGroup||!activeId)return;const action=await askDialog({title:"Manage group members",message:"Type add or remove",placeholder:"add"});if(!action||!["add","remove"].includes(action.trim().toLowerCase())){if(action!==null)setToast("Enter add or remove.");return;}const phone=await askDialog({title:`${action.trim().toLowerCase()==="add"?"Add":"Remove"} group member`,message:"Enter the member's registered phone number",placeholder:"+919876543210"});if(!phone)return;const user=users.find(u=>String(u.phone||"").replace(/[\s().-]/g,"")===phone.trim().replace(/[\s().-]/g,""));if(!user){setToast("Contact not found. The user must have an account and appear in your contacts.");return;}try{const updated=await api(`/api/conversations/${activeId}/members`,{method:"PATCH",body:JSON.stringify({action:action.trim().toLowerCase(),userId:user._id})});setActive(updated);setConversations(prev=>prev.map(c=>c._id===updated._id?updated:c));setToast(`Group member ${action.trim().toLowerCase()}ed.`);}catch(e){setToast(e.message);}}
  async function createPoll(){if(!activeId)return;const question=await askDialog({title:"Create poll",message:"Poll question",placeholder:"What should we decide?"});if(!question)return;const raw=await askDialog({title:"Poll options",message:"Enter at least two options separated by commas",placeholder:"Option A, Option B"});if(!raw)return;try{const poll=await api(`/api/conversations/${activeId}/polls`,{method:"POST",body:JSON.stringify({question,options:raw.split(",").map(x=>x.trim()).filter(Boolean),multiple:(await askDialog({title:"Poll settings",message:"Allow people to choose multiple options?",type:"confirm",confirmText:"Allow multiple"}))})});setPolls(prev=>[poll,...prev.filter(p=>p._id!==poll._id)]);setToast("Poll created.");}catch(e){setToast(e.message);}}
  async function votePoll(poll,index){try{const updated=await api(`/api/polls/${poll._id}/vote`,{method:"POST",body:JSON.stringify({option:index})});setPolls(prev=>prev.map(p=>p._id===updated._id?updated:p));}catch(e){setToast(e.message);}}
  async function createEvent(){if(!activeId)return;const title=await askDialog({title:"Create event",message:"Event title",placeholder:"Team catch-up"});if(!title)return;const when=await askDialog({title:"Event date & time",message:"Date/time (YYYY-MM-DDTHH:mm)",value:new Date(Date.now()+86400000).toISOString().slice(0,16)});if(!when)return;try{const event=await api(`/api/conversations/${activeId}/events`,{method:"POST",body:JSON.stringify({title,startsAt:new Date(when).toISOString()})});setEvents(prev=>[event,...prev]);setToast("Event created.");}catch(e){setToast(e.message);}}
  async function respondEvent(event,response){try{const updated=await api(`/api/events/${event._id}/respond`,{method:"POST",body:JSON.stringify({response})});setEvents(prev=>prev.map(x=>x._id===updated._id?updated:x));}catch(e){setToast(e.message);}}
  async function editProfile(){const name=await askDialog({title:"Edit profile",message:"Your display name",value:me.name||"",confirmText:"Next"});if(name===null)return;const about=await askDialog({title:"Edit profile",message:"About",value:me.about||"Available",confirmText:"Save"});if(about===null)return;try{const updated=await api("/api/users/me",{method:"PATCH",body:JSON.stringify({name,about})});setMe(updated);localStorage.setItem("cw_user",JSON.stringify(updated));setToast("Profile updated.");}catch(e){setToast(e.message);}}
  async function profilePrivacy(e){e?.preventDefault();try{const updated=await api("/api/users/me",{method:"PATCH",body:JSON.stringify({privacy:privacyDraft})});setMe({...me,...updated});localStorage.setItem("cw_user",JSON.stringify({...me,...updated}));setPrivacyOpen(false);setToast("Privacy preferences saved.");}catch(e){setToast(e.message);}}
  async function contactSafety(action){if(!activeOther)return;try{if(action==="block"){const result=await api(`/api/users/${activeOther._id}/block`,{method:"POST",body:JSON.stringify({})});setToast(result.blocked?`${activeOther.name} blocked`:`${activeOther.name} unblocked`);}else{const reason=await askDialog({title:"Report contact",message:"Why are you reporting this account? (optional)",placeholder:"Add a reason"});if(reason===null)return;await api(`/api/users/${activeOther._id}/report`,{method:"POST",body:JSON.stringify({reason})});setToast("Report submitted for review.");}}catch(e){setToast(e.message);}}
  async function disappearingTimer(seconds){if(seconds===undefined){setChatMenuOpen(true);setTimerMenuOpen(true);return;}try{const data=await api(`/api/conversations/${activeId}/settings`,{method:"PATCH",body:JSON.stringify({disappearingAfter:seconds})});setActive({...active,...data});setConversations(prev=>prev.map(c=>c._id===activeId?{...c,...data}:c));setChatMenuOpen(false);setTimerMenuOpen(false);setToast(seconds?"Disappearing messages enabled":"Disappearing messages disabled");}catch(e){setToast(e.message);}}

  async function openAI() {
    setAiOpen(false); setActiveSection("ai"); setMobileSidebar(false);
    try { const items=await api("/api/ai/conversations"); setAiConversations(items); if(aiConversationId){const current=await api(`/api/ai/conversations/${aiConversationId}`).catch(()=>null);if(current){setAiThread(current.messages||[]);return;}} if(items.length){const latest=await api(`/api/ai/conversations/${items[0]._id}`);setAiConversationId(latest._id);setAiThread(latest.messages||[]);setAiResult(latest.messages?.filter(m=>m.role==="assistant").at(-1)?.content||"");}else{setAiConversationId("");setAiThread([]);setAiResult("");} } catch(e){setToast(`AI history could not load: ${e.message}`);}
  }
  async function selectAIConversation(id) { try{const item=await api(`/api/ai/conversations/${id}`);setAiConversationId(item._id);setAiThread(item.messages||[]);setAiResult(item.messages?.filter(m=>m.role==="assistant").at(-1)?.content||"");setAiPrompt("");setAiHistoryOpen(false);}catch(e){setToast(e.message);} }
  function newAIConversation(){setAiConversationId("");setAiThread([]);setAiPrompt("");setAiResult("");setAiHistoryOpen(false);setActiveSection("ai");setAiOpen(false);}
  async function deleteAIConversation(id){try{await api(`/api/ai/conversations/${id}`,{method:"DELETE"});const next=aiConversations.filter(c=>c._id!==id);setAiConversations(next);if(aiConversationId===id){setAiConversationId("");setAiThread([]);setAiResult("");}setToast("AI chat deleted from your account.");}catch(e){setToast(e.message);}}

  async function runAI(mode="answer", overridePrompt="") {
    setAiBusy(true);setAiResult("");
    const prompt=overridePrompt.trim() || aiPrompt.trim() || (mode==="summarize" ? messages.map(m=>`${m.sender?.name||"User"}: ${m.text}`).join("\n") : draft);
    if(!prompt){setAiResult("Type a prompt or select a conversation with messages first.");setAiBusy(false);return;}
    try {const data=await api("/api/ai",{method:"POST",body:JSON.stringify({prompt,mode,conversationId:aiConversationId||undefined})});setAiResult(data.text);setAiConversationId(data.conversationId);setAiThread(data.messages||[]);setAiConversations(await api("/api/ai/conversations").catch(()=>[]));setAiPrompt(""); }
    catch(e){setAiResult(e.message);}
    finally{setAiBusy(false);}
  }
  async function handleChatMenuAction(action){
    if(action==="timer"){setTimerMenuOpen(v=>!v);return;}
    setChatMenuOpen(false);setTimerMenuOpen(false);
    if(["archive","mute","pin"].includes(action)){await conversationAction(action);return;}
    if(action==="block"||action==="report"){await contactSafety(action);return;}
    if(action==="search"){setMessageSearch(" ");return;}
    if(action==="info"){setToast(active?.isGroup?`${active.title} · ${active.members?.length||0} members`:`${activeOther?.name||"Contact"}${activeOther?.phone?` · ${activeOther.phone}`:""}${activeOther?.about?` · ${activeOther.about}`:""}`);return;}
    if(action==="select"){setToast("Message selection: hover a message and use its actions. Multi-select is not available yet.");return;}
    if(action==="close"){setActive(null);return;}
    if(action==="call"){await startCall("audio");return;}
    if(action==="video"){await startCall("video");return;}
    if(action==="theme"){setSettingsTab("chats");setActiveSection("settings");setToast("Chat settings opened.");return;}
    if(action==="export"){try{const blob=new Blob([JSON.stringify({chat:active?.title||activeName,exportedAt:new Date().toISOString(),messages},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`chatwave-chat-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast("Current chat exported.");}catch(e){setToast("Could not export this chat: "+e.message);}return;}
    if(action==="clear"){if(!active?._id)return;if(!await askDialog({title:"Clear this chat?",message:"This removes messages from your view only. Other participants keep their copies.",type:"confirm",confirmText:"Clear chat"}))return;try{await api(`/api/conversations/${active._id}/clear`,{method:"POST"});setMessages([]);setChatMenuOpen(false);setToast("Chat cleared from your account.");}catch(e){setToast(e.message||"Could not clear this chat.");}return;}
    if(action==="delete"){setToast("For safety, deleting a conversation permanently is disabled until per-user deletion is supported on the server.");}
  }

  function createGroup(){ setGroupWizard({title:"",description:"",selected:[],step:"members"}); }
  async function submitGroupWizard(){
    const title=String(groupWizard?.title||"").trim();const memberIds=groupWizard?.selected||[];
    if(title.length<2){setToast("Enter a group name with at least 2 characters.");return;}
    if(!memberIds.length){setToast("Select at least one participant.");return;}
    try{const c=await api("/api/conversations/group",{method:"POST",body:JSON.stringify({title,description:groupWizard.description,memberIds})});setConversations(prev=>[c,...prev.filter(item=>String(item._id)!==String(c._id))]);setActive(c);setActiveSection("chats");setChatFilter("all");setMobileSidebar(false);setGroupWizard(null);setToast(`Group “${title}” created.`);}catch(e){setToast(`Could not create group: ${e.message}`);}
  }

  function recordCall(entry) {
    const row={id:entry.id||`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:entry.name||"Contact",userId:entry.userId||"",type:entry.type||"audio",direction:entry.direction||"outgoing",status:entry.status||"started",createdAt:entry.createdAt||new Date().toISOString()};
    setCallHistory(prev=>{const next=[row,...prev].slice(0,100);try{localStorage.setItem(`cw_call_history_${me?._id||"guest"}`,JSON.stringify(next));}catch{}return next;});
  }
  function clearCallHistory(){setCallHistory([]);try{localStorage.removeItem(`cw_call_history_${me?._id||"guest"}`);}catch{}}
  async function startCall(type, targetConversation=null) {
    const callConversation=targetConversation||active;
    const callOther=callConversation?.members?.find(m=>m._id!==me?._id);
    if(!callConversation?._id||!callOther||callConversation.isGroup){setToast("Open a one-to-one chat to start a call. Group calls are not available yet.");return;}
    if(!socket?.connected){setToast("You are offline. Reconnect to ChatWave before starting a call.");return;}
    if(!navigator.mediaDevices?.getUserMedia){setToast("Calls require localhost or HTTPS and browser microphone/camera support.");return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==="video"});
      localStreamRef.current=stream;
      recordCall({name:callOther.name,userId:callOther._id,type,direction:"outgoing",status:"started"});
      setCall({type,role:"caller",conversationId:callConversation._id,other:callOther});
      setCallStatus("Calling… waiting for answer");
      const pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});pcRef.current=pc;
      stream.getTracks().forEach(track=>pc.addTrack(track,stream));
      pc.ontrack=e=>{remoteStreamRef.current=e.streams[0];if(remoteVideo.current)remoteVideo.current.srcObject=e.streams[0];if(remoteAudio.current)remoteAudio.current.srcObject=e.streams[0];};
      pc.onicecandidate=e=>{if(e.candidate)socket?.emit("call:signal",{conversationId:callConversation._id,targetUserId:callOther._id,callType:type,signal:{candidate:e.candidate}});};
      if(localVideo.current)localVideo.current.srcObject=stream;
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);
      socket?.emit("call:signal",{conversationId:callConversation._id,targetUserId:callOther._id,callType:type,signal:{description:pc.localDescription}});
    }catch(e){setToast("Camera/microphone unavailable: "+e.message);endCall();}
  }
  async function handleCallSignal(payload) {
    try {
      if(payload.signal?.description?.type==="offer"){
        const existing=callRef.current;
        if(existing && existing.accepted && existing.conversationId===payload.conversationId && pcRef.current){
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.signal.description));
          const answer=await pcRef.current.createAnswer();await pcRef.current.setLocalDescription(answer);
          socketRef.current?.emit("call:signal",{conversationId:payload.conversationId,targetUserId:payload.fromUserId,callType:payload.callType,signal:{description:pcRef.current.localDescription}});
          setCallStatus("Connected · screen sharing supported");
        } else if(existing){socketRef.current?.emit("call:signal",{conversationId:payload.conversationId,targetUserId:payload.fromUserId,callType:payload.callType,signal:{busy:true}});return;}
        else {recordCall({name:payload.fromName,userId:payload.fromUserId,type:payload.callType,direction:"incoming",status:"received"});setCall({type:payload.callType,role:"receiver",conversationId:payload.conversationId,other:{_id:payload.fromUserId,name:payload.fromName},pendingOffer:payload.signal.description});setCallStatus(`${payload.fromName} is calling…`);}
      } else if(payload.signal?.description?.type==="answer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.signal.description));for(const candidate of pendingCandidatesRef.current.splice(0)){await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(()=>{});}setCallStatus("Connected");
      } else if(payload.signal?.candidate) {
        if(pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.signal.candidate)).catch(()=>{});
        else pendingCandidatesRef.current.push(payload.signal.candidate);
      } else if(payload.signal?.busy) setCallStatus("Contact is busy.");
      else if(payload.signal?.declined) {setCallStatus("Call declined.");setTimeout(()=>{if(callRef.current?.conversationId===payload.conversationId)endCall();},1200);}
    } catch(e){setToast("Call signaling failed: "+e.message);}
  }
  async function acceptCall(){
    if(!call?.pendingOffer)return;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:call.type==="video"});localStreamRef.current=stream;
      const pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});pcRef.current=pc;
      stream.getTracks().forEach(t=>pc.addTrack(t,stream));
      pc.ontrack=e=>{remoteStreamRef.current=e.streams[0];if(remoteVideo.current)remoteVideo.current.srcObject=e.streams[0];if(remoteAudio.current)remoteAudio.current.srcObject=e.streams[0];};
      pc.onicecandidate=e=>{if(e.candidate)socket?.emit("call:signal",{conversationId:call.conversationId,targetUserId:call.other._id,callType:call.type,signal:{candidate:e.candidate}});};
      if(localVideo.current)localVideo.current.srcObject=stream;
      await pc.setRemoteDescription(new RTCSessionDescription(call.pendingOffer));for(const candidate of pendingCandidatesRef.current.splice(0)){await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(()=>{});}
      const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
      socket?.emit("call:signal",{conversationId:call.conversationId,targetUserId:call.other._id,callType:call.type,signal:{description:pc.localDescription}});
      setCall({...call,accepted:true,pendingOffer:null});setCallStatus("Connecting…");
    }catch(e){setToast("Could not accept call: "+e.message);endCall();}
  }
  async function toggleSpeaker(){
    const audioEl=remoteAudio.current;
    if(!audioEl){setToast("Speaker output becomes available when the other person connects.");return;}
    const next=!speakerEnabled;
    try{
      if(typeof audioEl.setSinkId==="function"){
        const devices=await navigator.mediaDevices.enumerateDevices();
        const outputs=devices.filter(d=>d.kind==="audiooutput");
        const target=next?"default":(outputs.find(d=>d.deviceId!=="default")?.deviceId||"default");
        await audioEl.setSinkId(target);
      } else {audioEl.volume=next?1:0.35;}
      setSpeakerEnabled(next);setToast(next?"Speaker output enabled":"Speaker output lowered / default output selected");
    }catch(e){setToast("Could not change speaker output. Check your browser audio-device permissions.");}
  }
  async function toggleScreenShare(){
    if(call?.type!=="video"){setToast("Screen sharing is available during video calls. Start a video call first.");return;}
    if(!call?.accepted||!pcRef.current){setToast("Answer the call first to share your screen.");return;}
    if(screenSharing){
      const share=screenStreamRef.current;const track=share?.getVideoTracks()[0];
      const cameraTrack=localStreamRef.current?.getVideoTracks()[0];
      const sender=pcRef.current.getSenders().find(item=>item.track?.kind==="video");
      try{if(sender){await sender.replaceTrack(cameraTrack||null);}else if(cameraTrack){pcRef.current.addTrack(cameraTrack,localStreamRef.current);}
        track?.stop();screenStreamRef.current=null;setScreenSharing(false);
        const offer=await pcRef.current.createOffer();await pcRef.current.setLocalDescription(offer);
        socketRef.current?.emit("call:signal",{conversationId:call.conversationId,targetUserId:call.other?._id,callType:call.type,signal:{description:pcRef.current.localDescription}});
      }catch(e){setToast("Could not stop screen sharing cleanly: "+e.message);}return;
    }
    if(!navigator.mediaDevices?.getDisplayMedia){setToast("Screen sharing is not supported in this browser. Use a current Chrome or Edge browser over HTTPS/localhost.");return;}
    try{
      const share=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});const track=share.getVideoTracks()[0];screenStreamRef.current=share;
      let sender=pcRef.current.getSenders().find(item=>item.track?.kind==="video");
      if(sender) await sender.replaceTrack(track); else pcRef.current.addTrack(track,share);
      track.onended=async()=>{
        if(!screenStreamRef.current)return;
        const camera=localStreamRef.current?.getVideoTracks()[0];
        const videoSender=pcRef.current?.getSenders().find(item=>item.track?.kind==="video");
        try{if(videoSender)await videoSender.replaceTrack(camera||null);}catch{}
        screenStreamRef.current=null;setScreenSharing(false);
        if(localVideo.current)localVideo.current.srcObject=localStreamRef.current;
        try{const renegotiate=await pcRef.current.createOffer();await pcRef.current.setLocalDescription(renegotiate);socketRef.current?.emit("call:signal",{conversationId:call.conversationId,targetUserId:call.other?._id,callType:call.type,signal:{description:pcRef.current.localDescription}});}catch{}
      };
      if(localVideo.current)localVideo.current.srcObject=share;
      setScreenSharing(true);
      const offer=await pcRef.current.createOffer();await pcRef.current.setLocalDescription(offer);
      socketRef.current?.emit("call:signal",{conversationId:call.conversationId,targetUserId:call.other?._id,callType:call.type,signal:{description:pcRef.current.localDescription}});
      setCallStatus("Sharing your screen");
    }catch(e){setToast(e.name==="NotAllowedError"?"Screen sharing was cancelled.":"Could not start screen sharing: "+e.message);}
  }
  function declineCall(){if(call?.role==="receiver")socket?.emit("call:signal",{conversationId:call.conversationId,targetUserId:call.other?._id,callType:call.type,signal:{declined:true}});endCall();}
  function endCall(){screenStreamRef.current?.getTracks().forEach(t=>t.stop());screenStreamRef.current=null;setScreenSharing(false);setSpeakerEnabled(true);pendingCandidatesRef.current=[];pcRef.current?.close();pcRef.current=null;localStreamRef.current?.getTracks().forEach(t=>t.stop());localStreamRef.current=null;if(localVideo.current)localVideo.current.srcObject=null;if(remoteVideo.current)remoteVideo.current.srcObject=null;if(remoteAudio.current)remoteAudio.current.srcObject=null;remoteStreamRef.current=null;setCall(null);setCallStatus("");}
  function useAIResult(){if(aiResult)setDraft(aiResult);setAiOpen(false);setActiveSection("chats");}
  function insertEmoji(emoji){setDraft(v=>v+emoji);setEmojiOpen(false);}
  async function exportBackup(){try{await api("/api/backup",{method:"POST",body:JSON.stringify({})});const response=await fetch(`${API}/api/backup/export`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok){const err=await response.json().catch(()=>({}));throw new Error(err.message||"Backup export failed.");}const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`chatwave-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast("Cloud snapshot saved to MongoDB and export downloaded.");}catch(e){setToast("Could not export backup: "+e.message);}}
  async function showDeviceInfo(){setToast("This version uses account sign-in tokens but does not yet provide server-managed linked-device revocation. Sign out on shared devices.");}
  async function searchAllMessages(){const q=globalSearchQuery.trim();if(q.length<2){setToast("Enter at least 2 characters to search messages.");return;}setGlobalSearchBusy(true);try{const results=await api(`/api/search/messages?q=${encodeURIComponent(q)}`);setGlobalSearchResults(results);setGlobalSearchOpen(true);}catch(e){setToast(e.message);}finally{setGlobalSearchBusy(false);}}
  async function saveTheme(theme){try{const updated=await api("/api/users/me",{method:"PATCH",body:JSON.stringify({preferences:{...(me?.preferences||{}),theme:"light"}})});const next={...me,...updated,preferences:{...(me?.preferences||{}),...(updated.preferences||{}),theme:"light"}};setMe(next);localStorage.setItem("cw_user",JSON.stringify(next));localStorage.setItem("cw_theme","light");setDarkMode(false);setToast("Light theme is enabled across ChatWave.");}catch(e){localStorage.setItem("cw_theme","light");setDarkMode(false);setToast(e.message);}}

  if(!token||!me) return <div className="auth-page"><div className="auth-glow"/><div className="auth-card"><div className="brand-mark"><MessageCircle size={27}/><span>chatwave<span className="brand-ai"> AI</span></span></div><p className="eyebrow">YOUR SPACE. YOUR PEOPLE.</p><h1>{authMode==="login"?"Welcome back.":signupStage==="phone"?"Verify your number.":signupStage==="otp"?"Check your messages.":"Secure your account."}</h1><p className="muted">{authMode==="login"?"Sign in with your verified mobile number.":signupStage==="phone"?"We'll send a one-time code by SMS before creating your account.":signupStage==="otp"?`Enter the verification code sent to ${auth.phone}.`:"Your number is verified. Create a password to finish signup."}</p>{authMode==="login"?<form onSubmit={submitAuth} className="auth-form"><label>Mobile number<input type="tel" autoComplete="tel" value={auth.phone} onChange={e=>setAuth({...auth,phone:e.target.value})} required pattern="\+[1-9]\d{7,14}" placeholder="+919876543210" title="Use international format, e.g. +919876543210"/></label><label>Password<input type="password" autoComplete="current-password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})} required minLength={10} placeholder="Your password"/></label>{authError&&<div className="error">{authError}</div>}<button className="primary wide" type="submit" disabled={authBusy}>{authBusy?"Please wait…":"Sign in"}</button></form>:signupStage==="phone"?<form onSubmit={startPhoneVerification} className="auth-form"><label>Full name<input autoComplete="name" value={auth.name} onChange={e=>setAuth({...auth,name:e.target.value})} required minLength={2} maxLength={60} placeholder="Your name"/></label><label>Mobile number<input type="tel" autoComplete="tel" value={auth.phone} onChange={e=>setAuth({...auth,phone:e.target.value})} required pattern="\+[1-9]\d{7,14}" placeholder="+919876543210" title="Use international format, e.g. +919876543210"/></label>{authError&&<div className="error">{authError}</div>}<button className="primary wide" type="submit" disabled={authBusy}>{authBusy?"Sending SMS…":"Send SMS OTP"}</button></form>:signupStage==="otp"?<form onSubmit={verifyPhoneOtp} className="auth-form"><label>SMS verification code<input inputMode="numeric" autoComplete="one-time-code" value={auth.code} onChange={e=>setAuth({...auth,code:e.target.value.replace(/\D/g,"").slice(0,10)})} required minLength={4} maxLength={10} placeholder="Enter OTP"/></label>{authNotice&&<div className="hint">{authNotice}</div>}{authError&&<div className="error">{authError}</div>}<button className="primary wide" type="submit" disabled={authBusy}>{authBusy?"Verifying…":"Verify number"}</button><button className="secondary wide" type="button" disabled={authBusy} onClick={startPhoneVerification}>Resend OTP</button><button className="link-button" type="button" onClick={()=>{setSignupStage("phone");setAuthError("");}}>Change number</button></form>:<form onSubmit={submitAuth} className="auth-form"><label>Full name<input value={auth.name} onChange={e=>setAuth({...auth,name:e.target.value})} required minLength={2} maxLength={60} placeholder="Your name"/></label><label>Create password<input type="password" autoComplete="new-password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})} required minLength={10} maxLength={128} placeholder="At least 10 characters"/></label>{authError&&<div className="error">{authError}</div>}<button className="primary wide" type="submit" disabled={authBusy}>{authBusy?"Creating account…":"Create account"}</button></form>}<p className="switch-auth">{authMode==="login"?"New to ChatWave?":"Already have an account?"} <button className="link-button" onClick={()=>switchAuthMode(authMode==="login"?"register":"login")}>{authMode==="login"?"Create account":"Sign in"}</button></p><div className="auth-foot"><span><span className="tiny-dot"/> SMS-verified accounts</span><span>Secure sign-in</span></div></div></div>;

  async function githubRequest(url) {
    const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) { const body = await response.json().catch(()=>({})); throw new Error(body.message || `GitHub request failed (${response.status})`); }
    return response.json();
  }
  async function searchGithub() {
    const username = githubQuery.trim().replace(/^@/, "");
    if (!username) { setGithubError("Enter a GitHub username."); return; }
    setGithubBusy(true); setGithubError(""); setGithubProfile(null); setGithubRepos([]); setGithubRepo(null); setGithubFiles([]); setGithubReadme(""); setGithubCode(null);
    try {
      const [profile, repos] = await Promise.all([
        githubRequest(`https://api.github.com/users/${encodeURIComponent(username)}`),
        githubRequest(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`)
      ]);
      setGithubProfile(profile); setGithubRepos(Array.isArray(repos)?repos:[]);
    } catch (error) { setGithubError(error.message || "Could not load this GitHub profile."); }
    finally { setGithubBusy(false); }
  }
  async function openGithubRepo(repo) {
    setGithubBusy(true); setGithubError(""); setGithubRepo(repo); setGithubPath(""); setGithubCode(null); setGithubReadme("");
    try {
      const [files, readme] = await Promise.all([
        githubRequest(`https://api.github.com/repos/${repo.full_name}/contents`),
        githubRequest(`https://api.github.com/repos/${repo.full_name}/readme`).catch(()=>null)
      ]);
      setGithubFiles(Array.isArray(files)?files:[]);
      if (readme?.content) setGithubReadme(decodeURIComponent(escape(atob(readme.content.replace(/\n/g,"")))));
    } catch(error) { setGithubError(error.message || "Could not load repository contents."); }
    finally { setGithubBusy(false); }
  }
  async function openGithubPath(item) {
    if (!githubRepo) return;
    setGithubBusy(true); setGithubError(""); setGithubCode(null);
    try {
      if (item.type === "dir") {
        const files = await githubRequest(`https://api.github.com/repos/${githubRepo.full_name}/contents/${item.path}`);
        setGithubPath(item.path); setGithubFiles(Array.isArray(files)?files:[]);
      } else {
        const file = await githubRequest(`https://api.github.com/repos/${githubRepo.full_name}/contents/${item.path}`);
        if (file.encoding === "base64" && file.content) setGithubCode({name:item.name, content:decodeURIComponent(escape(atob(file.content.replace(/\n/g,""))))});
        else setGithubCode({name:item.name,content:"This file is too large or uses an unsupported encoding. Open it on GitHub to view the full content."});
      }
    } catch(error) { setGithubError(error.message || "Could not open this path."); }
    finally { setGithubBusy(false); }
  }
  async function goGithubRoot() {
    if (!githubRepo) return; setGithubBusy(true); setGithubPath(""); setGithubCode(null);
    try { const files=await githubRequest(`https://api.github.com/repos/${githubRepo.full_name}/contents`); setGithubFiles(Array.isArray(files)?files:[]); }
    catch(error) { setGithubError(error.message || "Could not load repository."); }
    finally { setGithubBusy(false); }
  }
  function searchPublicInstagram() {
    const username = publicInstagramUsername.trim().replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "");
    if (!username) { setInstagramError("Enter an Instagram username first."); return; }
    setInstagramError(""); setPublicInstagramUsername(username); setPublicInstagramProfile(username);
  }
  async function openMediaUrl() {
    const raw = mediaInput.trim();
    setMediaError("");
    if (mediaPreview?.blobUrl) URL.revokeObjectURL(mediaPreview.blobUrl);
    setMediaPreview(null);
    if (!raw) { setMediaError("Paste a media URL to preview it."); return; }
    let parsed;
    try { parsed = new URL(raw); } catch { setMediaError("Enter a complete URL beginning with https:// or http://."); return; }
    if (!["http:", "https:"].includes(parsed.protocol)) { setMediaError("Only secure web URLs are supported."); return; }
    const path = parsed.pathname.toLowerCase();
    const cleanPath = path.replace(/\/+$/, "");
    const instagramHost = /(^|\.)instagram\.com$/i.test(parsed.hostname) || /(^|\.)instagr\.am$/i.test(parsed.hostname);
    const instagramMatch = instagramHost ? cleanPath.match(/^\/(?:share\/)?(reel|reels|p|tv)\/([a-zA-Z0-9_-]+)\/?$/i) : null;
    if (instagramMatch) {
      const kind = ["reel", "reels"].includes(instagramMatch[1].toLowerCase()) ? "reel" : instagramMatch[1].toLowerCase();
      const shortcode = instagramMatch[2];
      const canonical = `https://www.instagram.com/${kind}/${shortcode}/`;
      const preview={ url:canonical, kind:"instagram", name:`Instagram ${kind === "reel" ? "Reel" : kind === "tv" ? "Video" : "Post"}`, embed:`https://www.instagram.com/${kind}/${shortcode}/embed/captioned/`, shortcode };
      // Preview through Instagram's public embed first. Do not run the download endpoint
      // during preview: it expects a media file, while a Reel permalink returns HTML.
      setMediaPreview(preview);
      return;
    }
    const ext = cleanPath.split("/").pop().includes(".") ? cleanPath.split("/").pop().split(".").pop() : "";
    const kind = ["jpg","jpeg","png","gif","webp","avif","bmp","svg"].includes(ext) ? "image" : ["mp4","webm","ogv","mov","m4v"].includes(ext) ? "video" : ["mp3","wav","ogg","m4a","aac","flac","opus"].includes(ext) ? "audio" : ext === "pdf" ? "pdf" : ["txt","md","csv"].includes(ext) ? "text" : ["doc","docx","xls","xlsx","ppt","pptx"].includes(ext) ? "office" : "link";
    setMediaPreview({ url: parsed.href, kind, name: (()=>{try{return decodeURIComponent(cleanPath.split("/").pop() || parsed.hostname)}catch{return cleanPath.split("/").pop() || parsed.hostname}})() });
  }
  async function downloadMediaUrl() {
    if (!mediaPreview || mediaBusy) return;
    setMediaBusy(true);
    try {
      setMediaError("");
      // Reuse the already-resolved preview blob where possible; otherwise request the public media from the backend.
      let response = null;
      let blob = mediaPreview.blobUrl ? await fetch(mediaPreview.blobUrl).then(r=>r.blob()) : null;
      if (!blob) {
        response = await fetch(`${API}/api/media/download?url=${encodeURIComponent(mediaPreview.url)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) { const payload = await response.json().catch(async () => ({ message: await response.text().catch(() => "") })); throw new Error(payload.message || `Download failed (${response.status}).`); }
        blob = await response.blob();
      }
      if (!blob.size || blob.type === "text/html") throw new Error("The server returned a webpage instead of a media file. The source may require login or block downloads.");
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response?.headers?.get("content-disposition") || "";
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      let safeServerName = encodedName ? decodeURIComponent(encodedName) : (plainName || "");
      safeServerName = safeServerName.replace(/[\\/\0-\x1f]/g, "_");
      const anchor = document.createElement("a"); anchor.href = objectUrl;
      anchor.download = safeServerName || mediaPreview.fileName || (mediaPreview.kind === "instagram" ? "instagram-video.mp4" : mediaPreview.name) || "chatwave-download";
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(()=>URL.revokeObjectURL(objectUrl), 60000);
      setToast("Download started.");
    } catch (error) { setMediaError(error.message || "Could not download this URL."); }
    finally { setMediaBusy(false); }
  }
  async function downloadInstagramVideo(item) {
    if (!item?.id || instagramDownloadId) return;
    setInstagramDownloadId(String(item.id));
    setInstagramError("");
    try {
      const response = await fetch(`${API}/api/instagram/media/${encodeURIComponent(item.id)}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Instagram could not provide this video for download.");
      }
      const blob = await response.blob();
      if (!blob.size || (!blob.type.startsWith("video/") && blob.type !== "application/octet-stream")) throw new Error("Instagram returned an invalid video file. Please refresh and try again.");
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      const extension = blob.type.includes("webm") ? "webm" : blob.type.includes("quicktime") ? "mov" : "mp4";
      anchor.download = `chatwave-instagram-${item.id}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    } catch (error) {
      setInstagramError(error.message || "Could not download this Instagram video.");
    } finally {
      setInstagramDownloadId("");
    }
  }
  async function loadInstagramAccount() {
    setInstagramAccountBusy(true); setInstagramError("");
    try {
      const account = await api("/api/instagram/account");
      if (!account.configured) { setInstagramProfile(null); setInstagramMedia([]); setInstagramCursor(""); setInstagramHasMore(false); return; }
      setInstagramProfile(account.profile);
      const page = await api("/api/instagram/media");
      setInstagramMedia(Array.isArray(page.data)?page.data:[]);
      setInstagramCursor(page.paging?.cursors?.after||"");
      setInstagramHasMore(Boolean(page.paging?.next || page.paging?.hasNext));
    } catch (error) { setInstagramError(error.message||"Could not load the connected Instagram account."); }
    finally { setInstagramAccountBusy(false); }
  }
  async function connectInstagram() {
    try { setInstagramError(""); const result = await api("/api/instagram/oauth/start"); window.location.assign(result.url); }
    catch (error) { setInstagramError(error.message || "Could not start Instagram login."); }
  }
  async function disconnectInstagram() {
    try { await api("/api/instagram/account", { method: "DELETE" }); setInstagramProfile(null); setInstagramMedia([]); setInstagramCursor(""); setInstagramHasMore(false); setToast("Instagram account disconnected."); }
    catch (error) { setInstagramError(error.message || "Could not disconnect Instagram."); }
  }
  async function loadMoreInstagramMedia() {
    if (!instagramCursor || instagramAccountBusy) return;
    setInstagramAccountBusy(true);
    try {
      const page = await api(`/api/instagram/media?after=${encodeURIComponent(instagramCursor)}`);
      setInstagramMedia(prev=>[...prev,...(Array.isArray(page.data)?page.data:[])]);
      setInstagramCursor(page.paging?.cursors?.after||"");
      setInstagramHasMore(Boolean(page.paging?.next || page.paging?.hasNext));
    } catch (error) { setInstagramError(error.message||"Could not load more Instagram media."); }
    finally { setInstagramAccountBusy(false); }
  }
  useEffect(()=>{if(activeSection==="instagram"&&token)loadInstagramAccount();if(activeSection==="resumes"&&token)loadResumes();if(activeSection==="linkedin"&&token)loadLinkedInLinks();},[activeSection,token]);
  useEffect(()=>{ if(!token) return; const params=new URLSearchParams(window.location.search); const status=params.get("instagram"); const error=params.get("instagram_error"); if(status==="connected"){ setActiveSection("instagram"); loadInstagramAccount(); setToast("Instagram account connected successfully."); window.history.replaceState({}, document.title, window.location.pathname); } else if(error){ setActiveSection("instagram"); setInstagramError(error); window.history.replaceState({}, document.title, window.location.pathname); } },[token]);
  useEffect(()=>{
    if(instagramEmbedState!=="loading" || (!instagramItem?.embed && !instagramPublicProfile?.embed)) return;
    const timer=setTimeout(()=>setInstagramEmbedState(state=>state==="loading"?"timeout":state),12000);
    return ()=>clearTimeout(timer);
  },[instagramEmbedState,instagramItem?.embed,instagramPublicProfile?.embed]);
  function loadInstagramItem() {
    const raw=instagramInput.trim();
    setInstagramError(""); setInstagramItem(null); setInstagramPublicProfile(null); setInstagramEmbedState("idle");
    if (!raw) { setInstagramError("Enter an Instagram username or paste a public post, Reel or carousel URL."); return; }
    let url;
    try {
      const normalized=/^https?:\/\//i.test(raw)?raw:`https://www.instagram.com/${raw.replace(/^@/,"")}`;
      url = new URL(normalized);
    } catch { setInstagramError("Enter a valid Instagram URL or username."); return; }
    const host=url.hostname.toLowerCase().replace(/^www\./,"");
    if (!["instagram.com","m.instagram.com"].includes(host)) { setInstagramError("Only Instagram URLs are supported. Paste a link from instagram.com."); return; }
    const parts=url.pathname.split("/").filter(Boolean);
    const kind=parts[0] && ["p","reel","tv"].includes(parts[0].toLowerCase()) ? parts[0].toLowerCase() : "profile";
    if (kind==="profile") {
      const username=(parts[0]||"").replace(/^@/,"");
      if (!username || !/^[a-zA-Z0-9._]{1,30}$/.test(username) || ["accounts","explore","direct","about","developer","api"].includes(username.toLowerCase())) {
        setInstagramError("Enter a valid Instagram username or public profile URL."); return;
      }
      if (instagramProfile?.username?.toLowerCase()===username.toLowerCase()) { setInstagramTab("ALL"); setInstagramItem(null); setInstagramPublicProfile(null); return; }
      setInstagramEmbedState("loading");
      setInstagramPublicProfile({username, url:`https://www.instagram.com/${encodeURIComponent(username)}/`, embed:`https://www.instagram.com/${encodeURIComponent(username)}/embed/`});
      return;
    }
    const shortcode=parts[1];
    if (!shortcode || !/^[A-Za-z0-9_-]{5,}$/.test(shortcode)) { setInstagramError("That post/Reel URL does not contain a valid content ID."); return; }
    const canonical=`https://www.instagram.com/${kind}/${encodeURIComponent(shortcode)}/`;
    setInstagramEmbedState("loading");
    setInstagramItem({kind,shortcode,url:canonical,embed:`${canonical}embed/`});
  }

  useEffect(()=>{localStorage.setItem("cw_theme","light");setDarkMode(false);document.documentElement.dataset.theme="light";},[]);

  return <div className={`app-shell theme-light ${["github","instagram","linkedin","media"].includes(activeSection)?"social-workspace":""} ${activeSection==="calls"?"calls-workspace":""}`}>
    {cameraOpen&&<div className="drawer-backdrop camera-backdrop" onClick={closeCamera}><section className="camera-compose" onClick={e=>e.stopPropagation()}><div className="drawer-head"><strong>{cameraRecording?"Recording video":"Camera"}</strong><button type="button" className="icon-btn" onClick={closeCamera} aria-label="Close camera"><X size={18}/></button></div><video ref={cameraVideoRef} className="camera-preview" autoPlay muted playsInline/><div className="camera-status">{cameraRecording?`Recording · ${String(Math.floor(cameraSeconds/60)).padStart(2,"0")}:${String(cameraSeconds%60).padStart(2,"0")}`:"Take a photo or record a short video"}</div><div className="camera-actions"><button type="button" className="secondary" onClick={capturePhoto} disabled={cameraRecording||uploading}><Camera size={17}/> Take photo</button><button type="button" className={`primary camera-record ${cameraRecording?"recording":""}`} onClick={toggleCameraVideo} disabled={uploading}>{cameraRecording?"Stop & send video":"Record video"}</button></div><p className="privacy-note">Camera permission is required. Short videos work best; uploads are limited to 8 MB.</p></section></div>}
    {statusOpen&&<div className="drawer-backdrop" onClick={()=>setStatusOpen(false)}><section className="status-compose" onClick={e=>e.stopPropagation()}><div className="drawer-head"><strong>Add to my status</strong><button className="icon-btn" onClick={()=>setStatusOpen(false)}><X size={18}/></button></div><form onSubmit={createStatus}><textarea value={statusDraft} onChange={e=>setStatusDraft(e.target.value)} maxLength={700} placeholder="Type a status update…" rows={4}/><input ref={statusInput} className="status-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4" onChange={e=>setStatusFile(e.target.files?.[0]||null)}/>{statusFile&&<div className="status-file-chip"><FileText size={16}/><span>{statusFile.name}</span><button type="button" onClick={()=>{setStatusFile(null);if(statusInput.current)statusInput.current.value="";}}>Remove</button></div>}<div className="status-compose-actions"><button className="secondary" type="button" onClick={()=>statusInput.current?.click()}><Camera size={16}/> Photo / video</button><span>Visible for 24 hours</span><button className="primary" type="submit" disabled={uploading||(!statusDraft.trim()&&!statusFile)}>{uploading?"Sharing…":"Share status"}</button></div></form></section></div>}
    {globalSearchOpen&&<div className="drawer-backdrop" onClick={()=>setGlobalSearchOpen(false)}><section className="status-compose search-compose" onClick={e=>e.stopPropagation()}><div className="drawer-head"><strong>Search all messages</strong><button className="icon-btn" onClick={()=>setGlobalSearchOpen(false)}><X size={18}/></button></div><form className="global-search-form" onSubmit={e=>{e.preventDefault();searchAllMessages();}}><input autoFocus value={globalSearchQuery} onChange={e=>setGlobalSearchQuery(e.target.value)} placeholder="Search message text…"/><button className="primary" type="submit" disabled={globalSearchBusy}>{globalSearchBusy?"Searching…":"Search"}</button></form><div className="global-search-results">{globalSearchResults.map(item=><button className="global-search-result" key={item._id} onClick={()=>{const c=conversations.find(x=>x._id===String(item.conversation?._id||item.conversation));if(c){setActive(c);setActiveSection("chats");setGlobalSearchOpen(false);setMobileSidebar(false);}else setToast("Conversation is no longer available.");}}><strong>{item.sender?.name||"Message"} · {item.conversationInfo?.isGroup?item.conversationInfo?.title:"Direct chat"}</strong><span>{item.text}</span><small>{new Date(item.createdAt).toLocaleString()}</small></button>)}{globalSearchResults.length===0&&<p className="privacy-note">Search results will appear here. Search is limited to conversations you belong to.</p>}</div></section></div>}
    {settingsOpen&&<div className="drawer-backdrop" onClick={()=>setSettingsOpen(false)}><section className="status-compose settings-compose" onClick={e=>e.stopPropagation()}><div className="drawer-head"><strong>ChatWave settings</strong><button className="icon-btn" onClick={()=>setSettingsOpen(false)}><X size={18}/></button></div><div className="settings-row"><div><strong>Privacy & read receipts</strong><small>Control last-seen visibility and read receipts</small></div><button className="secondary" onClick={()=>{setSettingsOpen(false);setPrivacyDraft({lastSeen:me?.privacy?.lastSeen||"everyone",readReceipts:me?.privacy?.readReceipts!==false});setPrivacyOpen(true);}}>Manage</button></div><div className="settings-row"><div><strong>Chat backup</strong><small>Save a snapshot in MongoDB and download an export</small></div><button className="secondary" onClick={exportBackup}>Export</button></div><div className="settings-row"><div><strong>Linked devices</strong><small>Device session management requires server-side session support</small></div><button className="secondary" onClick={showDeviceInfo}>View</button></div><div className="settings-row"><div><strong>Account security</strong><small>Use a strong password and sign out from shared devices</small></div><button className="secondary" onClick={()=>{setSettingsOpen(false);setToast("Account security: SMS verification and password sign-in are enabled. Session/device management needs backend support.");}}>Details</button></div><div className="settings-row"><div><strong>Personalize chat</strong><small>Theme saved to your account across logins</small></div><div className="theme-actions"><button className="secondary" onClick={()=>saveTheme("light")}>Light theme enabled</button></div></div><div className="settings-row"><div><strong>Search all messages</strong><small>Find messages across your conversations</small></div><button className="secondary" onClick={()=>{setGlobalSearchQuery("");setGlobalSearchResults([]);setGlobalSearchOpen(true);}}>Search</button></div><p className="privacy-note">Linked-device revocation, end-to-end encryption, and automatic cloud restore are not enabled in this build. Export is an account-data download, not a scheduled cloud backup.</p></section></div>}
    {privacyOpen&&<div className="drawer-backdrop" onClick={()=>setPrivacyOpen(false)}><section className="status-compose privacy-compose" onClick={e=>e.stopPropagation()}><div className="drawer-head"><strong>Privacy</strong><button className="icon-btn" onClick={()=>setPrivacyOpen(false)}><X size={18}/></button></div><form onSubmit={profilePrivacy}><label className="privacy-label">Who can see my last seen?</label><div className="privacy-options">{[["everyone","Everyone"],["contacts","My contacts"],["nobody","Nobody"]].map(([value,label])=><label key={value}><input type="radio" name="lastSeen" value={value} checked={privacyDraft.lastSeen===value} onChange={()=>setPrivacyDraft(v=>({...v,lastSeen:value}))}/>{label}</label>)}</div><label className="privacy-check"><input type="checkbox" checked={privacyDraft.readReceipts} onChange={e=>setPrivacyDraft(v=>({...v,readReceipts:e.target.checked}))}/> Read receipts</label><p className="privacy-note">If you turn off read receipts, you won't send or receive read receipts in individual chats.</p><button className="primary wide" type="submit">Save changes</button></form></section></div>}

    <nav className="app-rail" aria-label="Main navigation">
      <button className={`rail-button ${activeSection==="chats"?"rail-active":""}`} title="Chats" onClick={()=>{setActiveSection("chats");setMobileSidebar(true);}}><MessageCircle size={19}/></button>
      <button className={`rail-button ${activeSection==="calls"?"rail-active":""}`} title="Calls" onClick={()=>{setActiveSection("calls");setMobileSidebar(false);}}><Phone size={19}/></button>
      <button className={`rail-button ${activeSection==="status"?"rail-active":""}`} title="Status updates" onClick={()=>{setActiveSection("status");setMobileSidebar(false);}}><CircleUserRound size={19}/></button>
      <button className={`rail-button ${activeSection==="resumes"?"rail-active":""}`} title="Resume library" onClick={()=>{setActiveSection("resumes");setMobileSidebar(false);}}><FileText size={19}/></button>
      <button className={`rail-button ${activeSection==="github"?"rail-active":""}`} title="GitHub Explorer" onClick={()=>{setActiveSection("github");setMobileSidebar(false);}}><Github size={19}/></button>
      <button className={`rail-button ${activeSection==="instagram"?"rail-active":""}`} title="Instagram Viewer" onClick={()=>{setActiveSection("instagram");setMobileSidebar(false);}}><Instagram size={19}/></button>
      <button className={`rail-button ${activeSection==="linkedin"?"rail-active":""}`} title="LinkedIn Explorer" onClick={()=>{setActiveSection("linkedin");setMobileSidebar(false);}}><Linkedin size={19}/></button>
      <button className="rail-button" title="Groups" onClick={()=>{setActiveSection("chats");createGroup();}}><Users size={19}/></button>
      <span className="rail-divider"/>
      <button className={`rail-button rail-ai ${activeSection==="ai"?"rail-active":""}`} title="ChatWave AI" onClick={openAI}><Sparkles size={19}/></button>
      <div className="rail-spacer"/>
      <button className={`rail-button ${activeSection==="settings"&&settingsTab!=="profile"?"rail-active":""}`} title="Settings" onClick={()=>{setSettingsTab("general");setActiveSection("settings");setMobileSidebar(false);}}><Settings size={19}/></button>
      <button className={`rail-avatar ${activeSection==="settings"&&settingsTab==="profile"?"rail-active":""}`} title="Your profile" onClick={()=>{setSettingsTab("profile");setActiveSection("settings");setMobileSidebar(false);}}><Avatar user={me} size={28}/></button>
    </nav>
    {mobileSidebar&&<div className="sidebar-scrim" onClick={()=>setMobileSidebar(false)}/>}
    <aside className={`sidebar ${mobileSidebar?"sidebar-open":""} ${["github","instagram","linkedin","media"].includes(activeSection)?"sidebar-social-hidden":""} ${activeSection==="calls"?"sidebar-calls-hidden":""}`}>
      {activeSection==="status" ? <div className="whatsapp-status-sidebar">
        <div className="side-top status-side-top"><div className="brand-mark small"><span>Status</span></div><div className="side-actions"><button className="icon-btn" title="Status options" onClick={()=>setToast("Status updates disappear after 24 hours.")}><MoreVertical size={19}/></button><button className="icon-btn" title="Add status" onClick={()=>setStatusOpen(true)}><Plus size={20}/></button></div></div>
        <div className="status-list-scroll">
          <button className="status-list-item my-status-item" onClick={()=>{const mine=statuses.filter(st=>String(st.author?._id||st.author)===String(me?._id));if(mine.length){setViewingStatus(mine[0]);setMobileSidebar(false);}else setStatusOpen(true);}}><span className={`status-list-avatar my-status-avatar ${statuses.some(st=>String(st.author?._id||st.author)===String(me?._id))?"has-status":""}`}><Avatar user={me} size={38}/><i><Plus size={12}/></i></span><span className="status-list-copy"><strong>My status</strong><small>{statuses.some(st=>String(st.author?._id||st.author)===String(me?._id))?"Tap to view your status":"Click to add status update"}</small></span></button>
          <div className="status-list-section-label">Recent</div>
          {statuses.filter(st=>String(st.author?._id||st.author) !== String(me?._id)).map(st=><button className="status-list-item" key={st._id} onClick={()=>{api(`/api/statuses/${st._id}/view`,{method:"POST",body:JSON.stringify({})}).catch(()=>{});setViewingStatus(st);setMobileSidebar(false);}}><span className="status-list-avatar"><Avatar user={st.author} size={38}/></span><span className="status-list-copy"><strong>{st.author?.name||"Contact"}</strong><small>{timeLabel(st.createdAt)}</small>{st.text&&<small className="status-list-preview">{st.text}</small>}</span></button>)}
          {statuses.filter(st=>String(st.author?._id||st.author) !== String(me?._id)).length===0&&<div className="status-list-empty">Your contacts’ recent status updates will appear here.</div>}
        </div>
      </div> : <>
      <div className="side-top"><div className="brand-mark small"><span>Chats</span></div><div className="side-actions"><button className="icon-btn" title="New chat" onClick={()=>setQuery(query?"":" ")}><Plus size={20}/></button><button className="icon-btn" title="New group" onClick={createGroup}><Users size={18}/></button><button className="icon-btn" title="More options" onClick={()=>setSettingsOpen(true)}><MoreVertical size={19}/></button></div></div>
      <div className="profile-strip"><button className="profile-avatar-button" type="button" title="Change profile picture" onClick={()=>profileInput.current?.click()}><Avatar user={me} size={39} online/><span className="avatar-camera"><Camera size={12}/></span></button><input ref={profileInput} className="hidden-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadAvatar(e.target.files?.[0])}/><div className="profile-text"><strong>{me.name}</strong><span>{me.about||"Available"}</span></div><button className="icon-btn" onClick={()=>{setSettingsTab("profile");setActiveSection("settings");setMobileSidebar(false);}} title="Profile settings"><MoreVertical size={17}/></button><button className="icon-btn" onClick={()=>setSettingsOpen(true)} title="Settings, backup and devices">⚙</button></div>
      <div className="search-wrap"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search conversations or people"/></div>
      <div className="list-tabs"><span>CHATS</span><button onClick={()=>setQuery("")}>Clear</button></div><div className="chat-filters">{[["all","All"],["unread","Unread"],["favorites","Favorites"],["groups","Groups"]].map(([id,label])=><button key={id} className={chatFilter===id?"active":""} onClick={()=>setChatFilter(id)}>{label}</button>)}</div><div className="conversation-list">
        <button className={`conversation-item ai-conversation-item ${activeSection==="ai"?"selected":""}`} onClick={openAI}><div className="ai-list-avatar"><Sparkles size={19}/></div><div className="conversation-meta"><div className="conversation-line"><strong>ChatWave AI</strong><span className="ai-list-tag">AI</span></div><div className="preview-line"><span>{aiThread.at(-1)?.content||"Your private AI conversation"}</span></div></div></button>
        {filteredConversations.map(c=>{const other=c.members?.find(m=>m._id!==me._id);const title=c.isGroup?c.title:other?.name||"Conversation";return <button key={c._id} className={`conversation-item ${activeId===c._id?"selected":""}`} onClick={()=>{setActive(c);setActiveSection("chats");setMobileSidebar(false);}}><Avatar user={c.isGroup?{name:c.title}:other} online={!c.isGroup&&online.includes(other?._id)}/><div className="conversation-meta"><div className="conversation-line"><strong>{title}</strong><time>{timeLabel(c.lastMessage?.createdAt||c.updatedAt)}</time></div><div className="preview-line"><span>{c.lastMessage?.text||"Start a conversation"}</span>{c.lastMessage&&<CheckCheck size={15} className="read-icon"/>}</div></div></button>;})}
        {filteredConversations.length===0&&<div className="empty-list"><MessageCircle size={23}/><strong>No conversations yet</strong><span>Choose a person below to say hello.</span></div>}
      </div>
      <div className="people-section"><div className="list-tabs"><span>PEOPLE</span><span>{filteredUsers.length}</span></div>{filteredUsers.slice(0,20).map(u=><button className="person-item" key={u._id} onClick={()=>openDirect(u)}><Avatar user={u} online={online.includes(u._id)}/><div className="person-meta"><strong>{u.name}</strong><span>{online.includes(u._id)?"Online":u.about||u.phone||u.email}</span></div><Plus size={16} className="person-add"/></button>)}{filteredUsers.length===0&&<p className="hint">Other users appear here after they register.</p>}</div>
      <div className="sidebar-bottom"><div className="secure-label"><span className="tiny-dot"/> Connected workspace</div><span className="version">CHATWAVE / 1.0</span></div>
      </>}
    </aside>
    <main className="main-panel">
      {activeSection==="resumes" ? <section className="section-page resume-library-page"><header className="section-page-header"><div><span className="eyebrow">PERSONAL DOCUMENTS</span><h1>Resume library</h1><p>Store multiple resume versions and organize them by role or category.</p></div></header><div className="resume-library-grid"><form className="resume-upload-panel" onSubmit={saveResume}><div className="resume-panel-icon"><FileText size={24}/></div><h2>Add a resume</h2><label>Resume title<input value={resumeTitle} onChange={e=>setResumeTitle(e.target.value)} placeholder="e.g. Full Stack Developer – Nov 2026" maxLength={120}/></label><label>Category<select value={resumeCategory} onChange={e=>setResumeCategory(e.target.value)}>{["Full Stack Developer","Frontend Developer","Backend Developer","React Developer","Node.js Developer","Software Engineer","Internship","General","Other"].map(x=><option key={x}>{x}</option>)}</select></label><input ref={resumeInput} className="hidden-file-input" type="file" accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>setResumeFile(e.target.files?.[0]||null)}/><button type="button" className="resume-file-picker" onClick={()=>resumeInput.current?.click()}><FileText size={18}/><span>{resumeFile?.name||"Choose PDF or Word document"}</span><small>Max 10 MB</small></button><button className="primary" type="submit" disabled={resumeBusy||!resumeFile||!resumeTitle.trim()}>{resumeBusy?<LoaderCircle size={16} className="spin"/>:<Save size={16}/>} Save resume</button></form><div className="resume-list-panel"><div className="resume-list-heading"><div><h2>Saved resumes</h2><p>{resumes.length} document{resumes.length===1?"":"s"} in your library</p></div></div>{resumes.length?Object.entries(resumes.reduce((acc,r)=>{(acc[r.category||"Other"]??=[]).push(r);return acc;},{})).map(([category,items])=><section className="resume-category" key={category}><div className="resume-category-title"><Folder size={17}/><strong>{category}</strong><span>{items.length}</span></div>{items.map(r=><div className="resume-item" key={r._id}><div className="resume-item-icon"><FileText size={19}/></div><div className="resume-item-copy"><strong>{r.title}</strong><small>{r.fileName} · {(r.fileSize/1024/1024).toFixed(2)} MB · {new Date(r.createdAt).toLocaleDateString()}</small></div><a className="resume-open-link" href={mediaSource(r.fileUrl)} target="_blank" rel="noreferrer" title="Open resume"><ExternalLink size={17}/></a><button className="icon-btn" title="Delete resume" onClick={()=>deleteResume(r._id)}><X size={16}/></button></div>)}</section>):<div className="resume-empty"><FileText size={30}/><strong>No resumes saved yet</strong><span>Upload your first resume and it will appear here under its category.</span></div>}</div></div></section> : activeSection==="settings" ? <section className="settings-page">
        <aside className="settings-nav"><div className="settings-nav-heading"><span className="eyebrow">CHATWAVE</span><h1>Settings</h1><p>Manage your account and preferences</p></div>
          {[["profile","Profile",UserRound,"Your name, photo and about"],["general","General",Settings,"Startup and close"],["account","Account",ShieldCheck,"Security and account info"],["privacy","Privacy",ShieldCheck,"Blocked contacts, disappearing messages"],["chats","Chats",MessageSquare,"Theme, wallpaper, chat settings"],["video","Video & voice",Video,"Camera, microphone and speakers"],["notifications","Notifications",Bell,"Messages, groups, sounds"],["keyboard","Keyboard shortcuts",Keyboard,"Quick actions"],["help","Help and feedback",CircleHelp,"Help center and privacy policy"]].map(([id,label,Icon,desc])=><button key={id} className={`settings-nav-item ${settingsTab===id?"selected":""}`} onClick={()=>setSettingsTab(id)}><Icon size={17}/><span><strong>{label}</strong><small>{desc}</small></span><ChevronRight size={14}/></button>)}
          <button className="settings-logout" onClick={logout}><LogOut size={16}/> Log out</button>
        </aside>
        <div className="settings-content">
          {settingsTab==="profile" ? <><div className="settings-content-head"><span className="eyebrow">YOUR ACCOUNT</span><h2>Profile</h2><p>Manage how you appear to other people on ChatWave.</p></div><div className="profile-settings-card"><button className="profile-settings-avatar" onClick={()=>profileInput.current?.click()} title="Change profile picture"><Avatar user={me} size={104}/><span><Camera size={15}/></span></button><div className="profile-settings-name"><h3>{me?.name||"Your name"}</h3><p>{me?.phone||me?.email||"ChatWave account"}</p><button className="secondary" onClick={editProfile}>Edit profile</button></div></div><div className="profile-detail-row"><div><strong>Name</strong><small>How your name appears to contacts</small></div><span>{me?.name||"Not set"}</span><button className="secondary" onClick={editProfile}>Edit</button></div><div className="profile-detail-row"><div><strong>About</strong><small>Let people know your availability</small></div><span>{me?.about||"Available"}</span><button className="secondary" onClick={editProfile}>Edit</button></div><div className="profile-detail-row"><div><strong>Phone number</strong><small>Your account phone number</small></div><span>{me?.phone||"Not added"}</span></div></> :
          settingsTab==="general" ? <><div className="settings-content-head"><span className="eyebrow">PREFERENCES</span><h2>General</h2><p>Startup, close and app appearance.</p></div><div className="settings-option-card"><strong>Appearance</strong><p>Choose your ChatWave theme.</p><div className="theme-actions"><button className="secondary" onClick={()=>saveTheme("light")}>Light theme enabled</button></div></div><div className="settings-option-card"><strong>Chat backup</strong><p>Download a copy of your account data and conversations.</p><button className="secondary" onClick={exportBackup}>Export backup</button></div><div className="settings-option-card"><strong>Search messages</strong><p>Search across conversations you belong to.</p><button className="secondary" onClick={()=>{setGlobalSearchQuery("");setGlobalSearchResults([]);setGlobalSearchOpen(true);}}>Open search</button></div></> :
          settingsTab==="account" ? <><div className="settings-content-head"><h2>Account</h2><p>Security and account information.</p></div><div className="settings-option-card"><strong>Account security</strong><p>Password sign-in is enabled. Session and linked-device management require additional server support.</p><button className="secondary" onClick={showDeviceInfo}>View device information</button></div></> :
          settingsTab==="privacy" ? <><div className="settings-content-head"><h2>Privacy</h2><p>Control last-seen visibility and read receipts.</p></div><div className="settings-option-card"><strong>Privacy & read receipts</strong><p>Choose who can see your last seen and whether read receipts are sent.</p><button className="secondary" onClick={()=>{setPrivacyDraft({lastSeen:me?.privacy?.lastSeen||"everyone",readReceipts:me?.privacy?.readReceipts!==false});setPrivacyOpen(true);}}>Manage privacy</button></div></> :
          settingsTab==="chats" ? <><div className="settings-content-head"><h2>Chats</h2><p>Configure chat appearance, messages and media. Preferences are saved on this device.</p></div>
            <div className="settings-option-card"><strong>App appearance</strong><p>Choose the overall ChatWave appearance.</p><div className="theme-actions"><button className="secondary" onClick={()=>saveTheme("light")}>Light theme enabled</button></div></div>
            <div className="settings-option-card"><div className="chat-setting-line"><div><strong>Enter is send</strong><p>Press Enter to send; Shift + Enter creates a new line.</p></div><button role="switch" aria-checked={chatPrefs.enterToSend} className={`settings-switch ${chatPrefs.enterToSend?"on":""}`} onClick={()=>updateChatPrefs({enterToSend:!chatPrefs.enterToSend})}><i/></button></div>
            <div className="chat-setting-line"><div><strong>Media visibility</strong><p>Show photos and videos inline inside conversations.</p></div><button role="switch" aria-checked={chatPrefs.mediaVisibility} className={`settings-switch ${chatPrefs.mediaVisibility?"on":""}`} onClick={()=>updateChatPrefs({mediaVisibility:!chatPrefs.mediaVisibility})}><i/></button></div>
            <div className="chat-setting-line"><div><strong>Message font size</strong><p>Adjust the text size for messages.</p></div><div className="setting-control-inline"><input aria-label="Message font size" type="range" min="12" max="20" step="1" value={chatPrefs.fontSize} onChange={e=>updateChatPrefs({fontSize:Number(e.target.value)})}/><span>{chatPrefs.fontSize}px</span></div></div>
            <div className="chat-setting-line"><div><strong>Chat wallpaper</strong><p>Choose a background for the conversation area.</p></div><select value={chatPrefs.wallpaper} onChange={e=>updateChatPrefs({wallpaper:e.target.value})}><option value="default">Default</option><option value="dots">Soft dots</option><option value="grid">Subtle grid</option><option value="glow">Blue glow</option></select></div>
            <div className="chat-setting-line"><div><strong>Default disappearing messages</strong><p>Timer applied to the currently open conversation when selected.</p></div><select value={chatPrefs.defaultDisappearing} onChange={e=>{const v=Number(e.target.value);updateChatPrefs({defaultDisappearing:v});if(activeId)disappearingTimer(v);else setToast("Default timer saved; open a chat to apply it.");}}><option value="0">Off</option><option value="86400">24 hours</option><option value="604800">7 days</option><option value="7776000">90 days</option></select></div>
            <div className="chat-setting-line"><div><strong>Export current chat</strong><p>Download the open conversation as a JSON file.</p></div><button className="secondary" onClick={()=>handleChatMenuAction("export") } disabled={!activeId}>Export chat</button></div>
            <div className="chat-setting-line"><div><strong>Reset chat preferences</strong><p>Restore the default message and wallpaper preferences.</p></div><button className="secondary" onClick={()=>updateChatPrefs({enterToSend:true,mediaVisibility:true,fontSize:14,wallpaper:"default",defaultDisappearing:0})}>Reset</button></div></div></> :
          settingsTab==="video" ? <><div className="settings-content-head"><h2>Video & voice</h2><p>Review your camera and microphone permissions.</p></div><div className="settings-option-card"><strong>Camera & microphone</strong><p>Browser permissions control camera, microphone, and screen sharing. Use the call controls during a call to mute, change speaker output, or share your screen.</p><button className="secondary" onClick={()=>setToast("Camera and microphone permissions are managed by your browser. Use the lock icon beside the address bar to review them.")}>Permission help</button></div></> :
          settingsTab==="notifications" ? <><div className="settings-content-head"><h2>Notifications</h2><p>Message and call alerts.</p></div><div className="settings-option-card"><strong>Browser notifications</strong><p>Notification delivery depends on browser permission and server support.</p><button className="secondary" onClick={()=>{if("Notification" in window)Notification.requestPermission().then(p=>setToast(`Notification permission: ${p}`));else setToast("This browser does not support notifications.");}}>Enable notifications</button></div></> :
          settingsTab==="keyboard" ? <><div className="settings-content-head"><h2>Keyboard shortcuts</h2><p>Quick actions for everyday chat.</p></div><div className="settings-option-card"><div className="shortcut-row"><kbd>Enter</kbd><span>Send message</span></div><div className="shortcut-row"><kbd>Shift + Enter</kbd><span>New line</span></div><div className="shortcut-row"><kbd>Esc</kbd><span>Close open panel</span></div></div></> :
          <><div className="settings-content-head"><h2>Help and feedback</h2><p>Get help using ChatWave.</p></div><div className="settings-option-card"><strong>Help & privacy</strong><p>For account issues, contact your ChatWave administrator.</p><button className="secondary" onClick={()=>setToast("Help and feedback: contact your ChatWave administrator for account support.")}>Contact support</button></div></>}
        </div>
      </section> : activeSection==="github" ? <section className="social-explorer-page github-explorer-page">
        <header className="social-page-header"><div className="social-brand-icon github-brand"><Github size={25}/></div><div><span className="eyebrow">DEVELOPER WORKSPACE</span><h1>GitHub Explorer</h1><p>Explore public GitHub profiles, repositories, README files and source code without leaving ChatWave.</p></div></header>
        <form className="social-search-bar" onSubmit={e=>{e.preventDefault();searchGithub();}}><Github size={19}/><input value={githubQuery} onChange={e=>setGithubQuery(e.target.value)} placeholder="Search GitHub username (e.g. torvalds)"/><button className="primary" type="submit" disabled={githubBusy}>{githubBusy?"Loading…":"Explore profile"}</button></form>
        {githubError&&<div className="social-error">{githubError}</div>}
        {githubProfile&&<><div className="github-profile-card"><img src={githubProfile.avatar_url} alt={`${githubProfile.login} avatar`}/><div className="github-profile-info"><h2>{githubProfile.name||githubProfile.login}</h2><span className="github-profile-handle">@{githubProfile.login}</span><p>{githubProfile.bio||"No public bio provided."}</p><div className="github-stats"><span><strong>{githubProfile.public_repos}</strong> repositories</span><span><strong>{githubProfile.followers}</strong> followers</span><span><strong>{githubProfile.following}</strong> following</span></div></div></div>
        <div className="github-workspace-grid"><section className="github-repo-panel"><div className="social-panel-heading"><div><h3>Public repositories</h3><p>{githubRepos.length} repositories · recently updated</p></div></div><div className="github-repo-list">{githubRepos.map(repo=><button key={repo.id} className={`github-repo-row ${githubRepo?.id===repo.id?"selected":""}`} onClick={()=>openGithubRepo(repo)}><span className="repo-title"><strong>{repo.name}</strong>{repo.private&&<small>Private</small>}</span><span>{repo.description||"No description provided."}</span><span className="repo-meta">{repo.language&&<i/>}{repo.language||"—"} <Star size={13}/>{repo.stargazers_count} <GitFork size={13}/>{repo.forks_count}</span></button>)}{githubRepos.length===0&&<p className="social-empty">No public repositories found.</p>}</div></section>
        <section className="github-code-panel"><div className="social-panel-heading"><div><h3>{githubRepo?githubRepo.full_name:"Repository browser"}</h3><p>{githubRepo?githubRepo.description||"Browse repository files and README.":"Choose a repository to browse its files."}</p></div></div>
        {githubRepo&&<><div className="github-file-toolbar"><button className="secondary" onClick={goGithubRoot}>Root</button><span>{githubPath||"/"}</span></div>{githubCode?<div className="github-code-view"><div className="github-code-title"><FileCode2 size={15}/>{githubCode.name}<button className="secondary" onClick={()=>setGithubCode(null)}>Back to files</button></div><pre>{githubCode.content}</pre></div>:<div className="github-file-list">{githubFiles.map(file=><button key={file.sha} onClick={()=>openGithubPath(file)}><span>{file.type==="dir"?<Folder size={16}/>:<FileCode2 size={16}/>}</span>{file.name}<small>{file.type==="dir"?"Folder":"File"}</small></button>)}{!githubFiles.length&&<p className="social-empty">No files in this folder.</p>}</div>}{githubReadme&&<details className="github-readme" open><summary><FileText size={15}/> README preview</summary><pre>{githubReadme}</pre></details>}</>}
        </section></div></>}</section> : activeSection==="instagram" ? <section className="social-explorer-page instagram-explorer-page">
        <header className="social-page-header"><div className="social-brand-icon instagram-brand"><Instagram size={25}/></div><div><span className="eyebrow">INSTAGRAM WORKSPACE</span><h1>Instagram inside ChatWave</h1><p>Browse the connected account’s authorized profile, posts and Reels here without switching apps.</p></div><div className="instagram-header-actions"><button className="primary instagram-connect" onClick={connectInstagram}><Instagram size={15}/> {instagramProfile?"Connect / Switch account":"Login with Instagram"}</button>{instagramProfile&&<button className="secondary" onClick={disconnectInstagram}>Disconnect</button>}<button className="secondary instagram-refresh" onClick={loadInstagramAccount} disabled={instagramAccountBusy}><LoaderCircle size={15} className={instagramAccountBusy?"spin":""}/> Refresh</button></div></header>
        <form className="social-search-bar" onSubmit={e=>{e.preventDefault();loadInstagramItem();}}><Instagram size={19}/><input value={instagramInput} onChange={e=>setInstagramInput(e.target.value)} placeholder="Paste a public profile, post, Reel or carousel URL"/><button className="primary" type="submit">View in ChatWave</button></form>
        {instagramError&&<div className="social-error">{instagramError}</div>}
        {instagramAccountBusy&&!instagramProfile&&<div className="instagram-loading"><LoaderCircle className="spin" size={22}/> Loading connected Instagram account…</div>}
        {instagramProfile&&<>
          <div className="instagram-profile-card instagram-connected-profile">{instagramProfile.profile_picture_url?<img className="instagram-real-avatar" src={instagramProfile.profile_picture_url} alt="Instagram profile"/>:<div className="instagram-profile-avatar"><Instagram size={30}/></div>}<div className="instagram-profile-copy"><span className="eyebrow">CONNECTED INSTAGRAM ACCOUNT</span><h2>@{instagramProfile.username}</h2>{instagramProfile.name&&<strong>{instagramProfile.name}</strong>}<p>{instagramProfile.biography||"No public bio provided."}</p><div className="instagram-profile-stats"><span><b>{Number(instagramProfile.followers_count||0).toLocaleString()}</b> followers</span><span><b>{Number(instagramProfile.follows_count||0).toLocaleString()}</b> following</span><span><b>{Number(instagramProfile.media_count||instagramMedia.length).toLocaleString()}</b> posts</span></div></div><span className="instagram-connected-pill">● Connected</span></div>
          <div className="instagram-feed-toolbar"><div><h2>Media library</h2><p>{instagramMedia.length} loaded · newest first</p></div><div className="instagram-tabs">{[["ALL","All"],["VIDEO","Reels & videos"],["IMAGE","Photos"],["CAROUSEL_ALBUM","Carousels"]].map(([key,label])=><button key={key} className={instagramTab===key?"active":""} onClick={()=>setInstagramTab(key)}>{label}</button>)}</div></div>
          <div className="instagram-media-grid">{instagramMedia.filter(item=>instagramTab==="ALL"||item.media_type===instagramTab).map(item=><article className="instagram-media-card" key={item.id}>{item.media_type==="VIDEO"?<video src={item.media_url||item.thumbnail_url} poster={item.thumbnail_url||undefined} controls playsInline preload="metadata"/>:item.media_type==="CAROUSEL_ALBUM"&&item.children?.data?.length?<div className="instagram-carousel-preview">{item.children.data.map(child=>child.media_type==="VIDEO"?<video key={child.id} src={child.media_url||child.thumbnail_url} controls playsInline preload="metadata"/>:<img key={child.id} src={child.media_url||child.thumbnail_url} alt="Instagram carousel item"/>)}</div>:<img src={item.media_url||item.thumbnail_url} alt={item.caption||"Instagram post"}/>}<div className="instagram-media-info"><span>{item.media_type==="VIDEO"?"REEL / VIDEO":item.media_type==="CAROUSEL_ALBUM"?"CAROUSEL":"POST"} · {item.timestamp?new Date(item.timestamp).toLocaleDateString():""}</span><p>{item.caption||"No caption"}</p><div className="instagram-media-actions">{item.media_type==="VIDEO"&&<button className="primary instagram-download" type="button" onClick={()=>{fetch(`${API}/api/instagram/media/${encodeURIComponent(item.id)}/download`,{headers:{Authorization:`Bearer ${token}`}}).then(async r=>{if(!r.ok)throw new Error((await r.json().catch(()=>({}))).message||"Download failed");const blob=await r.blob();const objectUrl=URL.createObjectURL(blob);const a=document.createElement("a");a.href=objectUrl;a.download=`chatwave-instagram-${item.id}.mp4`;a.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);}).catch(err=>setInstagramError(err.message));}}><Download size={14}/> Download</button>}<span className="instagram-owner-note">{item.media_type==="VIDEO"?"Authorized media":"Connected account media"}</span></div></div></article>)}{instagramMedia.filter(item=>instagramTab==="ALL"||item.media_type===instagramTab).length===0&&<div className="instagram-feed-empty">{instagramMedia.length?"No media in this category.":"No media was returned for this connected account."}</div>}</div>
          {instagramHasMore&&<div className="instagram-load-more"><button className="secondary" onClick={loadMoreInstagramMedia} disabled={instagramAccountBusy}>{instagramAccountBusy?<LoaderCircle className="spin" size={15}/>:<ChevronDown size={15}/>} Load more posts & Reels</button></div>}
        </>}
        {instagramPublicProfile&&<><div className="instagram-profile-card instagram-public-profile-card"><div className="instagram-profile-avatar"><Instagram size={30}/></div><div className="instagram-profile-copy"><span className="eyebrow">PUBLIC PROFILE PREVIEW</span><h2>@{instagramPublicProfile.username}</h2><p>Official Instagram embed. Profile details and feed visibility are controlled by Instagram.</p></div><span className="instagram-connected-pill instagram-public-pill">Public profile</span></div><div className="instagram-embed-card instagram-single-embed"><div className="instagram-embed-head"><div><strong>Instagram profile · @{instagramPublicProfile.username}</strong><small>{instagramEmbedState==="loading"?"Connecting to Instagram…":instagramEmbedState==="timeout"?"Preview may be blocked": "Official embedded preview"}</small></div><div className="instagram-preview-actions"><button className="secondary" type="button" onClick={()=>window.open(instagramPublicProfile.url,"_blank","noopener,noreferrer")}><ExternalLink size={14}/> Open Instagram</button><button className="secondary" type="button" onClick={()=>{setInstagramPublicProfile(null);setInstagramEmbedState("idle");}}>Close</button></div></div>{instagramEmbedState==="loading"&&<div className="instagram-embed-status"><LoaderCircle className="spin" size={18}/> Loading Instagram preview…</div>}<iframe key={instagramPublicProfile.embed} title={`Instagram public profile ${instagramPublicProfile.username}`} src={instagramPublicProfile.embed} onLoad={()=>setInstagramEmbedState("loaded")} onError={()=>setInstagramEmbedState("timeout")} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen loading="eager" referrerPolicy="strict-origin-when-cross-origin"/>{instagramEmbedState==="timeout"&&<div className="instagram-embed-status instagram-embed-warning">Instagram has not responded in time or may block this embed. Open the profile directly on Instagram. ChatWave cannot extract a public profile feed through an unsupported API.</div>}<p className="instagram-embed-fallback">For a richer media library, connect an Instagram Professional account you manage. Only media authorized by Meta's API will appear there.</p></div></>}
        {instagramItem?.embed&&<div className="instagram-embed-card instagram-single-embed"><div className="instagram-embed-head"><div><strong>Instagram {instagramItem.kind==="reel"?"Reel":instagramItem.kind==="tv"?"video":"post"} preview</strong><small>{instagramEmbedState==="loading"?"Connecting to Instagram…":instagramEmbedState==="timeout"?"Preview may be blocked":"Official public embed · "+instagramItem.shortcode}</small></div><div className="instagram-preview-actions"><button className="secondary" type="button" onClick={()=>window.open(instagramItem.url,"_blank","noopener,noreferrer")}><ExternalLink size={14}/> Open original</button><button className="secondary" type="button" onClick={()=>{setInstagramItem(null);setInstagramEmbedState("idle");}}>Close</button></div></div>{instagramEmbedState==="loading"&&<div className="instagram-embed-status"><LoaderCircle className="spin" size={18}/> Loading Instagram preview…</div>}<iframe key={instagramItem.embed} title={`Instagram ${instagramItem.kind} ${instagramItem.shortcode}`} src={instagramItem.embed} onLoad={()=>setInstagramEmbedState("loaded")} onError={()=>setInstagramEmbedState("timeout")} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen loading="eager" referrerPolicy="strict-origin-when-cross-origin"/>{instagramEmbedState==="timeout"&&<div className="instagram-embed-status instagram-embed-warning">This embed may be unavailable because the post is private, deleted, region-restricted or embedding is disabled. Open the original Instagram URL to check.</div>}<p className="instagram-embed-fallback">Downloads are available only for media returned by an Instagram account you own or are authorized to manage.</p></div>}
        {!instagramProfile&&!instagramItem?.embed&&!instagramPublicProfile&&<div className="instagram-empty-state"><div className="instagram-empty-art"><Instagram size={38}/></div><h2>Connect your Instagram account</h2><p>Login securely through Instagram’s official authorization page. ChatWave never receives or stores your Instagram password. Instagram Login currently supports Professional (Business or Creator) accounts; after consent, the profile and media available to the API appear here. You can also paste a public post or Reel URL to preview its official embed.</p><div className="instagram-examples"><span>Profile + bio</span><span>All available Reels</span><span>Posts + carousels</span><span>Authorized video downloads</span></div></div>}
        <div className="instagram-capability-note"><strong>Instagram access & download limits</strong><p>Public profile and individual post/Reel embeds are shown inside ChatWave where Instagram permits embedding. Instagram does not provide a supported API for listing every Reel from any arbitrary username, accessing private profiles, or copying all Instagram features. The connected Professional account feed supports pagination through all media exposed by Meta’s API. Video downloads are restricted to media from the connected account that you own or are authorized to manage.</p></div>
      </section> : activeSection==="linkedin" ? <section className="social-explorer-page linkedin-explorer-page">
        <header className="social-page-header"><div className="social-brand-icon linkedin-brand"><Linkedin size={25}/></div><div><span className="eyebrow">PROFESSIONAL NETWORK</span><h1>LinkedIn Explorer</h1><p>Paste a LinkedIn profile, company or school link, preview it, open it on LinkedIn and save the useful ones to your private list.</p></div></header>
        <form className="social-search-bar" onSubmit={previewLinkedIn}><Linkedin size={19}/><input value={linkedinInput} onChange={e=>setLinkedinInput(e.target.value)} placeholder="https://www.linkedin.com/in/your-name" inputMode="url" autoComplete="off" spellCheck="false"/><button className="primary" type="submit" disabled={linkedinBusy}>{linkedinBusy&&!linkedinPreview?"Checking…":"Preview link"}</button></form>
        {linkedinError&&<div className="social-error">{linkedinError}</div>}
        {linkedinPreview&&<article className="linkedin-card linkedin-preview-card"><div className="linkedin-avatar">{(linkedinPreview.suggestedTitle||"in").slice(0,2).toUpperCase()}</div><div className="linkedin-card-body"><span className="linkedin-kind">{linkedinPreview.kind==="profile"?"Profile":linkedinPreview.kind==="company"?"Company":"School"}</span><h2>{linkedinPreview.suggestedTitle}</h2><span className="linkedin-url">{linkedinPreview.url.replace("https://","")}</span><input className="linkedin-note-input" value={linkedinNote} onChange={e=>setLinkedinNote(e.target.value.slice(0,500))} placeholder="Add a private note (optional)" disabled={Boolean(linkedinPreview.savedId)}/><div className="linkedin-actions"><button type="button" className="primary" onClick={()=>openLinkedIn(linkedinPreview.url)}><ExternalLink size={15}/> Open LinkedIn</button>{linkedinPreview.savedId?<button type="button" className="secondary" disabled><Save size={15}/> Saved</button>:<button type="button" className="secondary" onClick={saveLinkedInLink} disabled={linkedinBusy}><Save size={15}/> Save link</button>}<button type="button" className="secondary" onClick={()=>copyLinkedIn(linkedinPreview.url)}><Link2 size={15}/> Copy link</button></div></div></article>}
        <div className="linkedin-saved-head"><h2>Saved LinkedIn links</h2><p>{linkedinLinks.length} saved · visible only to you</p></div>
        <div className="linkedin-link-grid">{linkedinLinks.map(link=><article className="linkedin-card linkedin-link-card" key={link._id}><div className="linkedin-avatar small">{(link.title||"in").slice(0,2).toUpperCase()}</div><div className="linkedin-card-body"><span className="linkedin-kind">{link.kind==="profile"?"Profile":link.kind==="company"?"Company":"School"}</span><h3>{link.title}</h3><span className="linkedin-url">{link.url.replace("https://","")}</span>{link.note&&<p className="linkedin-note">{link.note}</p>}<div className="linkedin-actions"><button type="button" className="primary" onClick={()=>openLinkedIn(link.url)}><ExternalLink size={14}/> Open</button><button type="button" className="secondary" onClick={()=>editLinkedInNote(link)}>Note</button><button type="button" className="secondary" onClick={()=>copyLinkedIn(link.url)} title="Copy link"><Link2 size={14}/></button><button type="button" className="secondary" onClick={()=>deleteLinkedInLink(link._id)} title="Remove saved link"><X size={14}/></button></div></div></article>)}{!linkedinLinks.length&&<div className="linkedin-empty"><Linkedin size={30}/><h3>No saved links yet</h3><p>Preview a LinkedIn link above and save it to build your professional link list.</p></div>}</div>
        <div className="instagram-capability-note"><strong>How LinkedIn links work here</strong><p>LinkedIn requires you to be signed in and does not allow its pages to be scraped or embedded, so ChatWave never fetches or copies profile content. We check that the link is a real linkedin.com profile, company or school URL, show a preview card, and open the page on LinkedIn in a new tab where LinkedIn’s own sign-in and privacy settings apply.</p></div>
      </section> : activeSection==="media" ? <section className="social-explorer-page media-explorer-page">
        <header className="social-page-header"><div className="social-brand-icon media-brand"><Link2 size={25}/></div><div><span className="eyebrow">UNIVERSAL MEDIA VIEWER</span><h1>View media from a URL</h1><p>Paste a direct image, video, audio or document link to preview it inside ChatWave.</p></div></header>
        <form className="social-search-bar" onSubmit={e=>{e.preventDefault();openMediaUrl();}}><Link2 size={19}/><input type="url" value={mediaInput} onChange={e=>setMediaInput(e.target.value)} placeholder="Paste a direct media URL (https://...)"/><button className="primary" type="submit">Preview URL</button></form>
        {mediaError&&<div className="social-error">{mediaError}</div>}
        {!mediaPreview&&<div className="instagram-empty-state media-empty-state"><div className="instagram-empty-art media-empty-art"><Link2 size={34}/></div><h2>Your links, one simple viewer</h2><p>Preview direct links to images, MP4 videos, audio files and PDFs. Some websites block embedding or downloading; in those cases, open the original link in a new tab.</p><div className="instagram-examples"><span>Images</span><span>Video</span><span>Audio</span><span>PDF documents</span></div></div>}
        {mediaPreview&&<article className="media-preview-card"><div className="media-preview-head"><div><span className="eyebrow">{mediaPreview.kind.toUpperCase()} PREVIEW</span><h2>{mediaPreview.name}</h2><p>{new URL(mediaPreview.url).hostname}</p></div><div className="media-preview-actions"><button type="button" className="secondary" onClick={()=>window.open(mediaPreview.url,"_blank","noopener,noreferrer")}><ExternalLink size={15}/> Open original</button><button type="button" className="primary" onClick={downloadMediaUrl}><Download size={15}/> Download</button></div></div>
          <div className="media-preview-stage">{mediaPreview.kind==="image"?<img src={mediaPreview.url} alt={mediaPreview.name}/> : mediaPreview.kind==="video"?<video src={mediaPreview.url} controls playsInline preload="metadata"/> : mediaPreview.kind==="audio"?<div className="media-audio-preview"><FileAudio size={42}/><audio src={mediaPreview.url} controls preload="metadata"/></div> : mediaPreview.kind==="pdf"?<iframe title={`PDF preview: ${mediaPreview.name}`} src={mediaPreview.url}/> : mediaPreview.kind==="text"?<iframe title={`Document preview: ${mediaPreview.name}`} src={mediaPreview.url}/> : mediaPreview.kind==="office"?<iframe title={`Office document preview: ${mediaPreview.name}`} src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(mediaPreview.url)}`}/> : <div className="media-link-fallback"><FileVideo size={38}/><h3>Preview depends on the source website</h3><p>This URL does not look like a direct media file. Open the original page to view it.</p><a href={mediaPreview.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={14}/></a></div>}</div>
          <p className="media-preview-note">Downloads depend on the source server’s permissions and browser cross-origin rules. ChatWave does not bypass login, private content, DRM or website restrictions.</p>
        </article>}
      </section> : activeSection==="ai" ? <section className="ai-chat-page"><header className="chat-header ai-chat-header"><div className="ai-list-avatar"><Bot size={21}/></div><div className="header-person"><strong>ChatWave AI</strong><span>Private AI conversation · saved to your account</span></div><div className="header-actions"><button className="secondary ai-new-button" onClick={newAIConversation}><Plus size={15}/> New chat</button><button className="icon-btn" title="AI chat history" onClick={()=>setAiHistoryOpen(v=>!v)}><MoreVertical size={19}/></button></div></header>{aiHistoryOpen&&<div className="ai-inline-history">{aiConversations.map(c=><div className={`ai-history-row ${c._id===aiConversationId?"active":""}`} key={c._id}><button onClick={()=>selectAIConversation(c._id)}><strong>{c.title||"AI chat"}</strong><small>{c.messageCount||0} messages · {new Date(c.updatedAt).toLocaleDateString()}</small></button><button className="icon-btn" title="Delete AI chat" onClick={()=>deleteAIConversation(c._id)}><X size={14}/></button></div>)}{!aiConversations.length&&<small className="ai-history-empty">Your saved AI chats will appear here.</small>}</div>}<div className="ai-main-thread">{aiThread.length?aiThread.map((m,i)=><div className={`ai-thread-message ${m.role}`} key={`${m.createdAt||i}-${i}`}><span>{m.role==="user"?"You":"ChatWave AI"}</span><p>{m.content}</p></div>):<div className="ai-intro"><span className="eyebrow">YOUR AI ASSISTANT</span><h2>Hi {me?.name?.split(" ")[0]||"there"}, how can I help?</h2><p>Ask questions, translate text, summarize conversations, or draft a message. Your AI chat history is saved to your account.</p></div>}{aiBusy&&<div className="ai-thread-message assistant"><span>ChatWave AI</span><p><LoaderCircle size={15} className="spin"/> Thinking…</p></div>}</div><div className="ai-main-bottom"><div className="ai-main-suggestions"><button onClick={()=>{setAiPrompt(draft);runAI("reply");}}>✦ Draft a reply</button><button onClick={()=>runAI("summarize")}>↗ Summarize this chat</button><button onClick={()=>{const prompt=`Translate this message into Tamil:
${draft}`;setAiPrompt(prompt);runAI("translate",prompt);}}>文 Translate to Tamil</button><button onClick={()=>{setAiPrompt(draft);runAI("rewrite",draft);}}>✎ Rewrite message</button></div><form className="ai-main-composer" onSubmit={e=>{e.preventDefault();runAI("answer");}}><textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="Message ChatWave AI…" rows={2} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();runAI("answer");}}}/><button className="send-btn" type="submit" disabled={aiBusy||!aiPrompt.trim()}>{aiBusy?<LoaderCircle size={17} className="spin"/>:<Send size={17}/>}</button></form><p className="ai-main-disclaimer">AI can make mistakes · Conversation history is stored in your account database</p></div></section>  : activeSection==="status" ? (viewingStatus ? <section className="status-main-view"><div className="status-inline-header"><button className="icon-btn" title="Close status" onClick={()=>setViewingStatus(null)}><X size={19}/></button><Avatar user={viewingStatus.author} size={36}/><div><strong>{String(viewingStatus.author?._id||viewingStatus.author)===String(me?._id)?"My status":viewingStatus.author?.name||"Contact"}</strong><small>{timeLabel(viewingStatus.createdAt)}</small></div><span className="status-inline-spacer"/><button className="icon-btn" title="Add status" onClick={()=>setStatusOpen(true)}><Plus size={19}/></button></div><div className="status-inline-stage" style={{background:viewingStatus.background||"#182238"}}>{viewingStatus.mediaUrl&&(viewingStatus.mediaType?.startsWith("video/")||/\.mp4(?:$|\?)/i.test(viewingStatus.mediaUrl)?<video src={mediaSource(viewingStatus.mediaUrl)} controls autoPlay playsInline/>:<img src={mediaSource(viewingStatus.mediaUrl)} alt="Status update"/>)}{viewingStatus.text&&<p>{viewingStatus.text}</p>}</div><div className="status-inline-footer"><span>Status updates disappear after 24 hours</span><button className="secondary" onClick={()=>setViewingStatus(null)}>Close status</button></div></section> : <section className="status-main-empty"><div className="status-empty-illustration"><div className="status-empty-ring"><CircleUserRound size={36}/></div><span className="status-empty-spark">✦</span></div><h2>View status updates</h2><p>Select a contact’s status from the list to view their photo, video or text update.</p><button className="primary" onClick={()=>setStatusOpen(true)}><Plus size={17}/> Add status</button></section>) : activeSection==="calls" ? <section className="section-page calls-page"><header className="section-page-header"><div><span className="eyebrow">STAY CONNECTED</span><h1>Calls</h1><p>Recent call history and quick voice/video calling.</p></div></header><div className="calls-content-grid"><section className="calls-panel"><div className="calls-panel-heading"><h2>Recent calls</h2><button className="text-action" onClick={clearCallHistory} disabled={!callHistory.length}>Clear history</button></div>{callHistory.length?callHistory.map(item=><div className="call-history-row" key={item.id}><div className={`call-history-icon ${item.direction}`}><Phone size={16}/></div><div className="call-contact-meta"><strong>{item.name}</strong><small>{item.direction==="incoming"?"Incoming":"Outgoing"} {item.type==="video"?"video":"voice"} call · {item.status}</small></div><time>{new Date(item.createdAt).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</time><button className="call-round-action" title="Call again" onClick={async()=>{const user=users.find(u=>String(u._id)===String(item.userId));if(!user){setToast("This contact is no longer available.");return;}try{const c=await api("/api/conversations/direct",{method:"POST",body:JSON.stringify({userId:user._id})});setConversations(prev=>prev.some(x=>x._id===c._id)?prev:[c,...prev]);await startCall(item.type,c);}catch(e){setToast(e.message);}}}>{item.type==="video"?<Video size={16}/>:<Phone size={16}/>}</button></div>):<div className="calls-empty">Your recent calls will appear here.</div>}</section><section className="calls-panel"><div className="calls-panel-heading"><h2>People</h2><span>{filteredUsers.length} contacts</span></div>{filteredUsers.map(user=><div className="call-contact-row" key={user._id}><Avatar user={user} online={online.includes(user._id)}/><div className="call-contact-meta"><strong>{user.name}</strong><small>{online.includes(user._id)?"Online":"Available to chat"}</small></div><button className="call-round-action" title={`Voice call ${user.name}`} onClick={async()=>{try{const c=await api("/api/conversations/direct",{method:"POST",body:JSON.stringify({userId:user._id})});setConversations(prev=>prev.some(x=>x._id===c._id)?prev:[c,...prev]);await startCall("audio",c);}catch(e){setToast(e.message);}}}><Phone size={16}/></button><button className="call-round-action" title={`Video call ${user.name}`} onClick={async()=>{try{const c=await api("/api/conversations/direct",{method:"POST",body:JSON.stringify({userId:user._id})});setConversations(prev=>prev.some(x=>x._id===c._id)?prev:[c,...prev]);await startCall("video",c);}catch(e){setToast(e.message);}}}><Video size={16}/></button></div>)}{filteredUsers.length===0&&<div className="calls-empty">No registered contacts available yet.</div>}</section></div></section> : !active ? <div className="welcome-panel"><div className="quick-actions"><button className="quick-action" onClick={()=>setToast("Choose a chat first, then use the attachment button to send a document.")}><span><FileText size={21}/></span><small>Send document</small></button><button className="quick-action" onClick={()=>setMobileSidebar(true)}><span><UserRoundPlus size={21}/></span><small>Add contact</small></button><button className="quick-action" onClick={()=>setToast("Invite link sharing can be connected when invite links are enabled on the server.")}><span><Mail size={21}/></span><small>Invite a friend</small></button><button className="quick-action quick-ai" onClick={openAI}><span><Sparkles size={21}/></span><small>Ask ChatWave AI</small></button></div></div>
      : <><header className="chat-header"><button className="icon-btn mobile-menu" onClick={()=>setMobileSidebar(true)}><Menu size={19}/></button><Avatar user={active?.isGroup?{name:active.title}:activeOther} online={!active?.isGroup&&online.includes(activeOther?._id)}/><div className="header-person"><strong>{activeName}</strong><span>{typing?"typing…":active?.isGroup?`${active.members?.length||0} members`:online.includes(activeOther?._id)?"Online":"Tap to view profile"}</span></div><div className="header-actions"><button className="icon-btn ai-header" title="AI assistant" onClick={openAI}><Sparkles size={18}/></button><button className="icon-btn" title="Voice call" onClick={()=>startCall("audio")}><Phone size={18}/></button><button className="icon-btn" title="Video call" onClick={()=>startCall("video")}><Video size={19}/></button><button className="icon-btn" title="Search in chat" onClick={()=>setMessageSearch(v=>v?"":" ")}><Search size={18}/></button><button className="icon-btn" title="Chat options" onClick={()=>setChatMenuOpen(v=>!v)}><MoreVertical size={19}/></button>{chatMenuOpen&&<div className="chat-menu-popover" role="menu"><button onClick={()=>handleChatMenuAction("info")}>ⓘ <span>Contact info</span></button><button onClick={()=>handleChatMenuAction("search")}>⌕ <span>Search</span></button><button onClick={()=>handleChatMenuAction("select")}>☑ <span>Select messages</span></button><div className="chat-menu-divider"/><button onClick={()=>handleChatMenuAction("mute")}><span>♩</span><span className="chat-menu-label">Mute notifications</span><span className={`mini-switch ${active?.mutedBy?.some(id=>String(id)===String(me?._id))?"on":""}`}><i/></span></button><button onClick={()=>handleChatMenuAction("timer")}>◷ <span>Disappearing messages</span><span>›</span></button>{timerMenuOpen&&<div className="timer-submenu"><strong>Message timer</strong>{[[0,"Off"],[86400,"24 hours"],[604800,"7 days"],[7776000,"90 days"]].map(([seconds,label])=><button key={seconds} className={Number(active?.disappearingAfter||0)===seconds?"selected":""} onClick={()=>disappearingTimer(seconds)}><span>{label}</span>{Number(active?.disappearingAfter||0)===seconds&&<span>✓</span>}</button>)}</div>}<button onClick={()=>setToast("Chat lock requires private local storage and server-side access controls; it is not enabled yet.")}>▣ <span>Lock chat</span></button><button onClick={()=>handleChatMenuAction("theme")}>◉ <span>Chat theme</span></button><button onClick={()=>handleChatMenuAction("pin")}><span>♡</span><span className="chat-menu-label">Add to favourites</span><span className={`mini-switch ${active?.pinnedBy?.some(id=>String(id)===String(me?._id))?"on":""}`}><i/></span></button><button onClick={()=>handleChatMenuAction("export")}>⇩ <span>Export chat</span></button><button onClick={()=>handleChatMenuAction("archive")}>⊖ <span>Archive chat</span></button><button onClick={()=>handleChatMenuAction("close")}>⊗ <span>Close chat</span></button><div className="chat-menu-divider"/><button onClick={()=>handleChatMenuAction("call")}>↗ <span>Start voice call</span></button><button onClick={()=>handleChatMenuAction("video")}>▣ <span>Start video call</span></button><button onClick={()=>handleChatMenuAction("report")}>⚑ <span>Report</span></button><button onClick={()=>handleChatMenuAction("block")}>⊘ <span>Block</span></button><button onClick={()=>handleChatMenuAction("clear")}>⊖ <span>Clear chat</span></button><button className="danger" onClick={()=>handleChatMenuAction("delete")}>▤ <span>Delete chat</span></button></div>}</div></header>
      <section className={`messages-area wallpaper-${chatPrefs.wallpaper} ${chatPrefs.mediaVisibility?"media-visible":"media-hidden"}`} style={{"--message-font-size":`${chatPrefs.fontSize}px`}}>{messageSearch!==""&&<div className="message-search"><Search size={16}/><input autoFocus placeholder="Search messages in this chat…" value={messageSearch.trimStart()} onChange={e=>setMessageSearch(e.target.value||" ")}/><button onClick={()=>setMessageSearch("")}><X size={15}/></button></div>}<div className="date-divider"><span>YOUR CONVERSATION</span></div><div className="chat-tools"><button onClick={createPoll}>＋ Poll</button><button onClick={createEvent}>＋ Event</button>{active?.isGroup&&<button onClick={manageGroupMember}>Manage members</button>}<button onClick={scheduleMessage} disabled={!draft.trim()}>◷ Schedule draft</button><button onClick={viewScheduled}>Scheduled</button><button onClick={()=>conversationAction("pin")}>{active?.pinnedBy?.some(id=>String(id)===String(me?._id))?"Unpin chat":"Pin chat"}</button><button onClick={disappearingTimer}>Disappearing</button>{!active?.isGroup&&<><button onClick={()=>contactSafety("block")}>Block</button><button onClick={()=>contactSafety("report")}>Report</button></>}</div>{polls.map(p=><div className="feature-card" key={p._id}><strong>📊 {p.question}</strong>{p.options.map((o,i)=>{const total=p.options.reduce((n,x)=>n+x.votes.length,0);const mine=o.votes.some(id=>String(id)===String(me?._id));return <button className={`poll-option ${mine?"chosen":""}`} key={i} onClick={()=>votePoll(p,i)}><span>{o.label}</span><span>{o.votes.length}{total?` · ${Math.round(o.votes.length/total*100)}%`:""}</span></button>;})}<small>{p.multiple?"Multiple choices allowed":"Choose one option"} · {p.closed?"Closed":"Tap to vote"}</small></div>)}{events.map(ev=><div className="feature-card event-card" key={ev._id}><strong>📅 {ev.title}</strong><span>{new Date(ev.startsAt).toLocaleString()}</span>{ev.description&&<p>{ev.description}</p>}<div className="event-actions"><button onClick={()=>respondEvent(ev,"yes")}>Going</button><button onClick={()=>respondEvent(ev,"maybe")}>Maybe</button><button onClick={()=>respondEvent(ev,"no")}>Can’t go</button></div><small>{ev.attendees?.length||0} response(s)</small></div>)}{messages.length===0&&<div className="chat-empty"><div className="empty-icon"><MessageCircle size={24}/></div><strong>It's a good day to say hello.</strong><span>Send a message to start something meaningful.</span></div>}{messages.filter(m=>!messageSearch.trim()||m.text?.toLowerCase().includes(messageSearch.trim().toLowerCase())).map((m,i)=>{const own=m.sender?._id===me._id;const starred=m.starredBy?.some(id=>String(id)===String(me?._id));return <div key={m._id||i} className={`message-row ${own?"own":""}`}><div className="message-bubble">{m.replyTo?.text&&<div className="reply-quote">↪ {m.replyTo.text}</div>}{!own&&<span className="sender-name">{m.sender?.name}</span>}{m.fileUrl&&<div className="message-attachment">{m.mimeType?.startsWith("image/")?<a href={m.fileUrl} target="_blank" rel="noreferrer"><img className="attachment-image" src={m.fileUrl} alt={m.fileName||"Shared image"}/></a>:m.mimeType?.startsWith("video/")?<video className="attachment-video" src={m.fileUrl} controls playsInline preload="metadata"/>:m.mimeType?.startsWith("audio/")?<VoicePlayer src={m.fileUrl} fileName={m.fileName}/>:<a className="file-attachment" href={m.fileUrl} target="_blank" rel="noreferrer" download={m.fileName}><FileText size={22}/><span><strong>{m.fileName||"Shared file"}</strong><small>{m.fileSize?`${(m.fileSize/1024/1024).toFixed(2)} MB`:m.mimeType||"Attachment"}</small></span><Download size={16}/></a>}</div>}{m.text&&<p>{m.text}</p>}{m.forwarded&&<small className="forward-label">↗ Forwarded</small>}<div className="message-foot">{starred&&<span title="Starred">★</span>}<time>{timeLabel(m.createdAt)}{m.editedAt?" · edited":""}</time>{own&&<CheckCheck size={14} className={m.readBy?.some(id=>String(id)!==String(me?._id))?"receipt-read":""}/>}</div>{m.reactions?.length>0&&<div className="reaction-row">{m.reactions.map((r,ri)=><span key={ri}>{r.emoji}</span>)}</div>}<div className="message-actions"><button title="Reply" onClick={()=>messageAction(m,"reply")}>↩</button><button title="React" onClick={()=>messageAction(m,"react")}>☺</button><button title="Copy" onClick={()=>messageAction(m,"copy")}>▢</button><button title="Forward" onClick={()=>messageAction(m,"forward")}>↗</button><button title="Star" onClick={()=>messageAction(m,"star")}>★</button>{own&&<button title="Edit" onClick={()=>messageAction(m,"edit")}>✎</button>}{own&&<button title="Delete" onClick={()=>messageAction(m,"delete")}>⌫</button>}</div></div></div>;})}{typing&&<div className="typing-pill"><span/><span/><span/> typing</div>}<div ref={messagesEnd}/></section>
      {emojiOpen&&<div className="emoji-picker"><div className="emoji-picker-head"><strong>Emoji</strong><button type="button" className="icon-btn" onClick={()=>setEmojiOpen(false)}><X size={15}/></button></div><input className="emoji-search" value={emojiQuery} onChange={e=>setEmojiQuery(e.target.value)} placeholder="Search emoji or paste one…"/><div className="emoji-categories">{EMOJI_GROUPS.map(g=><button type="button" key={g.name} className={emojiGroup===g.name?"active":""} onClick={()=>setEmojiGroup(g.name)}>{g.name}</button>)}</div><div className="emoji-grid">{(emojiQuery?EMOJIS.filter(x=>x.emoji.includes(emojiQuery)||x.group.toLowerCase().includes(emojiQuery.toLowerCase())):EMOJIS.filter(x=>x.group===emojiGroup)).map((item,i)=><button type="button" key={`${item.emoji}-${i}`} title={item.group} onClick={()=>insertEmoji(item.emoji)}>{item.emoji}</button>)}</div><div className="sticker-shortcuts"><span>Quick stickers</span>{["❤️","😂","🥹","🔥","🎉","👍","🫶","✨"].map(st=><button type="button" key={st} onClick={()=>insertEmoji(st)}>{st}</button>)}</div><div className="emoji-picker-foot">{emojiQuery?"Matching emoji":"Select an emoji to insert"} · {emojiQuery?EMOJIS.filter(x=>x.emoji.includes(emojiQuery)||x.group.toLowerCase().includes(emojiQuery.toLowerCase())).length:EMOJIS.filter(x=>x.group===emojiGroup).length} shown</div></div>}{replyTo&&<div className="reply-banner"><span>Replying to <b>{replyTo.sender?.name||"message"}</b><br/>{replyTo.text}</span><button className="icon-btn" onClick={()=>setReplyTo(null)} type="button"><X size={16}/></button></div>}<input ref={attachmentInput} className="hidden-file-input" type="file" accept="image/*,video/mp4,video/webm,audio/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip" onChange={e=>uploadAttachment(e.target.files?.[0])}/><form className="composer" onSubmit={sendMessage}><div className="composer-tools"><button type="button" className="icon-btn" title="Attach photo or file" disabled={uploading} onClick={()=>attachmentInput.current?.click()}><Paperclip size={19}/></button><button type="button" className="icon-btn" title="Take photo or record video" disabled={uploading} onClick={openCamera}><Camera size={19}/></button><button type="button" className={`icon-btn ${emojiOpen?"active":""}`} title="Emoji picker" onClick={()=>{setEmojiOpen(v=>!v);setEmojiQuery("");}}><Smile size={19}/></button><button type="button" className="icon-btn" title="Schedule this draft" disabled={!draft.trim()} onClick={scheduleMessage}>◷</button></div><textarea value={draft} onChange={e=>onDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&chatPrefs.enterToSend){e.preventDefault();sendMessage();}}} placeholder="Write something thoughtful…" rows={1}/><button type="button" className={`icon-btn voice-record-btn ${recording?"recording":""}`} title={recording?"Stop recording":"Record voice message"} onClick={toggleVoiceRecording} disabled={uploading||Boolean(voiceDraft)}>{recording?<MicOff size={18}/>:<Mic size={18}/>}</button><button type="button" className="ai-compose" title="Draft with AI" onClick={()=>{setAiPrompt(draft);openAI();}}><Sparkles size={17}/></button><button type="submit" className="send-btn" disabled={!draft.trim()||uploading}><Send size={17}/></button></form>{recording&&<div className="recording-hint"><span className="recording-dot"/> Recording voice message · {Math.floor(recordSeconds/60).toString().padStart(2,"0")}:{(recordSeconds%60).toString().padStart(2,"0")} · tap mic to finish</div>}{voiceDraft&&<div className="voice-draft-bar"><audio src={voiceDraft.url} controls preload="metadata"/><span>{formatAudioTime(voiceDraft.duration)} recorded</span><button type="button" className="secondary" onClick={cancelVoiceDraft}>Cancel</button><button type="button" className="primary" onClick={sendVoiceDraft} disabled={uploading}><Send size={14}/> Send voice</button></div>}{uploading&&<div className="recording-hint">Uploading…</div>}<div className="composer-caption">{chatPrefs.enterToSend?"ENTER TO SEND":"ENTER FOR NEW LINE"} <span>·</span> SHIFT + ENTER FOR A NEW LINE</div></>}
    </main>
    {call&&<div className={`call-overlay ${call.role==="receiver"&&!call.accepted?"incoming-call-overlay":""}`}><div className={`call-card ${call.role==="receiver"&&!call.accepted?"incoming-call-card":""}`}><div className="call-top"><span className="call-live"><span className="tiny-dot"/> {call.role==="receiver"&&!call.accepted?"INCOMING CALL":"SECURE CONNECTION"}</span><button className="icon-btn" aria-label="Close call" onClick={declineCall}><X size={18}/></button></div><div className="call-avatar"><Avatar user={call.other} size={call.role==="receiver"&&!call.accepted?104:88}/></div><h2>{call.other?.name}</h2><p className="call-status-line">{call.role==="receiver"&&!call.accepted?`Incoming ${call.type} call…`:callStatus||"Connecting…"}</p><audio ref={remoteAudio} autoPlay playsInline />{call.type==="video"&&call.accepted&&<div className="video-grid"><video ref={remoteVideo} autoPlay playsInline/><video ref={localVideo} autoPlay playsInline muted/></div>}{call.role==="receiver"&&!call.accepted?<div className="incoming-call-actions"><button className="incoming-decline" onClick={declineCall} aria-label="Decline call"><PhoneOff size={23}/><span>Decline</span></button><button className="incoming-answer" onClick={acceptCall} aria-label="Answer call"><Phone size={23}/><span>Answer</span></button></div>:<><div className="call-controls"><button className={`call-control ${speakerEnabled?"active":""}`} aria-label="Toggle speaker output" title="Speaker" onClick={toggleSpeaker}>{speakerEnabled?<Volume2 size={18}/>:<VolumeX size={18}/>}<span>Speaker</span></button><button className="call-control end" aria-label="End call" title="End call" onClick={endCall}><PhoneOff size={20}/><span>End</span></button>{call.type==="video"&&<button className="call-control" aria-label="Toggle camera" title="Camera on/off" onClick={()=>{const tracks=localStreamRef.current?.getVideoTracks()||[];tracks.forEach(t=>t.enabled=!t.enabled);}}><Video size={18}/><span>Camera</span></button>}<button className={`call-control ${screenSharing?"active":""}`} aria-label="Share screen" title="Share screen" onClick={toggleScreenShare}>{screenSharing?<MonitorOff size={18}/>:<MonitorUp size={18}/>}<span>{screenSharing?"Stop share":"Share screen"}</span></button></div><span className="call-note">Keep this window open during your call.</span></>}</div></div>}
    {groupWizard&&<div className="dialog-backdrop" onClick={()=>setGroupWizard(null)}><section className="group-wizard" onClick={e=>e.stopPropagation()}><header className="group-wizard-head"><div><span className="eyebrow">NEW WHATSAPP-STYLE GROUP</span><h2>{groupWizard.step==="members"?"Add participants":"Group details"}</h2></div><button className="icon-btn" onClick={()=>setGroupWizard(null)}><X size={18}/></button></header>{groupWizard.step==="members"?<><div className="group-wizard-search"><Search size={17}/><input placeholder="Search contacts by name or phone" value={groupWizard.search||""} onChange={e=>setGroupWizard(g=>({...g,search:e.target.value}))}/></div><div className="group-selected-count">{groupWizard.selected.length} participant{groupWizard.selected.length===1?"":"s"} selected</div><div className="group-contact-list">{users.filter(u=>String(u._id)!==String(me?._id)&&`${u.name} ${u.phone||""}`.toLowerCase().includes((groupWizard.search||"").toLowerCase())).map(u=><button type="button" className={`group-contact-option ${groupWizard.selected.includes(String(u._id))?"selected":""}`} key={u._id} onClick={()=>setGroupWizard(g=>({...g,selected:g.selected.includes(String(u._id))?g.selected.filter(id=>id!==String(u._id)):[...g.selected,String(u._id)]}))}><Avatar user={u} size={40}/><span><strong>{u.name}</strong><small>{u.phone||u.email||"ChatWave contact"}</small></span><i>{groupWizard.selected.includes(String(u._id))?"✓":""}</i></button>)}{users.length===0&&<p className="hint">No registered contacts found yet.</p>}</div><footer className="group-wizard-footer"><button className="secondary" onClick={()=>setGroupWizard(null)}>Cancel</button><button className="primary" disabled={!groupWizard.selected.length} onClick={()=>setGroupWizard(g=>({...g,step:"details"}))}>Next <ChevronRight size={16}/></button></footer></>:<><div className="group-detail-avatar"><Users size={28}/></div><label>Group name<input autoFocus maxLength={80} value={groupWizard.title} onChange={e=>setGroupWizard(g=>({...g,title:e.target.value}))} placeholder="Enter group subject"/></label><label>Group description <textarea maxLength={500} value={groupWizard.description} onChange={e=>setGroupWizard(g=>({...g,description:e.target.value}))} placeholder="What is this group about?" rows={3}/></label><div className="group-member-summary"><Users size={16}/>{groupWizard.selected.length+1} members including you</div><footer className="group-wizard-footer"><button className="secondary" onClick={()=>setGroupWizard(g=>({...g,step:"members"}))}>Back</button><button className="primary" onClick={submitGroupWizard}>Create group</button></footer></>}</section></div>}
    {dialog&&<div className="dialog-backdrop" onClick={()=>closeDialog(null)}><form className="app-dialog" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();closeDialog(dialog.type==="confirm"?true:dialog.value);}}><div className="dialog-mark"><MessageCircle size={19}/></div><h3>{dialog.title}</h3><p>{dialog.message}</p>{dialog.type!=="confirm"&&<input autoFocus value={dialog.value} placeholder={dialog.placeholder} onChange={e=>setDialog(d=>({...d,value:e.target.value}))}/>}<div className="dialog-actions"><button type="button" className="secondary" onClick={()=>closeDialog(null)}>Cancel</button><button type="submit" className="primary">{dialog.confirmText}</button></div></form></div>}
    {toast&&<button className="toast" onClick={()=>setToast("")}>{toast}<X size={14}/></button>}
  </div>;
}
