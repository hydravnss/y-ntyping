import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";

const extensionName = "y-ntyping";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = {
  enabled: true,
  show_streaming: true,
  show_avatar: false,
  position: "bottom",
  animation: "bounce",
  name_color: "#7dffb3",
  text: "is typing..."
};

let indicatorEl = null;
let isGenerating = false;

async function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  const s = extension_settings[extensionName];

  $("#yn_enabled").prop("checked", s.enabled);
  $("#yn_show_streaming").prop("checked", s.show_streaming);
  $("#yn_show_avatar").prop("checked", s.show_avatar);
  $("#yn_position").val(s.position);
  $("#yn_animation").val(s.animation);
  $("#yn_name_color").val(s.name_color);
  $("#yn_text").val(s.text);

  updateIndicatorClasses();
}

function saveSetting(key, value) {
  extension_settings[extensionName][key] = value;
  saveSettingsDebounced();
  updateIndicatorClasses();
  if (isGenerating) showIndicator();
}

function createIndicator() {
  if (indicatorEl) return;

  indicatorEl = document.createElement("div");
  indicatorEl.id = "yn-typing-indicator";
  indicatorEl.innerHTML = `
    <img class="yn-avatar" src="" alt="">
    <span class="yn-name"></span>
    <span class="yn-text"></span>
    <span class="yn-dots">
      <span class="yn-dot"></span>
      <span class="yn-dot"></span>
      <span class="yn-dot"></span>
    </span>
  `;

  const chat = document.getElementById("chat");
  if (chat) {
    chat.parentNode.insertBefore(indicatorEl, chat.nextSibling);
  } else {
    document.body.appendChild(indicatorEl);
  }
}

function updateIndicatorClasses() {
  if (!indicatorEl) return;
  const s = extension_settings[extensionName];

  indicatorEl.className = "";
  indicatorEl.classList.add(`position-${s.position}`);
  indicatorEl.classList.add(`anim-${s.animation}`);
  if (s.show_avatar) indicatorEl.classList.add("show-avatar");

  indicatorEl.style.setProperty("--yn-name-color", s.name_color);
}

function cleanName(name) {
  if (!name) return "Character";
  // Remove file extensions like .png, .jpg, .webp, etc.
  return name.replace(/\.(png|jpe?g|webp|gif|svg|bmp)$/i, "").trim() || "Character";
}

function getCurrentCharName() {
  const ctx = getContext();
  if (!ctx) return "Character";

  // Single character chat
  if (ctx.characters && ctx.characterId != null) {
    const char = ctx.characters[ctx.characterId];
    if (char && char.name) {
      return cleanName(char.name);
    }
  }

  // Group chat
  if (ctx.groupId && ctx.groups) {
    const group = ctx.groups.find(g => g.id === ctx.groupId);
    if (group && group.members && group.members.length) {
      const member = group.members[0];
      if (typeof member === "string") {
        const found = ctx.characters?.find(c => c.avatar === member || c.name === member);
        if (found && found.name) return cleanName(found.name);
        return cleanName(member);
      }
    }
  }

  // Fallback
  if (ctx.name2) return cleanName(ctx.name2);

  return "Character";
}

function getCurrentAvatar() {
  const ctx = getContext();
  if (!ctx) return "";

  if (ctx.characters && ctx.characterId != null) {
    const char = ctx.characters[ctx.characterId];
    if (char && char.avatar) {
      return `/characters/${char.avatar}`;
    }
  }
  return "";
}

function showIndicator() {
  if (!extension_settings[extensionName]?.enabled) return;
  if (!indicatorEl) createIndicator();

  const s = extension_settings[extensionName];
  const name = getCurrentCharName();
  const text = (s.text || "is typing...").replace(/\{\{char\}\}/gi, name);

  indicatorEl.querySelector(".yn-name").textContent = name;
  indicatorEl.querySelector(".yn-text").textContent = " " + text;

  const avatarImg = indicatorEl.querySelector(".yn-avatar");
  if (s.show_avatar) {
    const src = getCurrentAvatar();
    avatarImg.src = src || "";
    avatarImg.style.display = src ? "block" : "none";
  }

  updateIndicatorClasses();
  indicatorEl.classList.add("visible");
  isGenerating = true;
}

function hideIndicator() {
  if (indicatorEl) {
    indicatorEl.classList.remove("visible");
  }
  isGenerating = false;
}

jQuery(async () => {
  try {
    const html = await $.get(`${extensionFolderPath}/settings.html`);
    $("#extensions_settings2").append(html);
  } catch (e) {
    console.warn("[y-ntyping] Could not load settings.html", e);
  }

  await loadSettings();
  createIndicator();

  $("#yn_enabled").on("change", function () {
    saveSetting("enabled", $(this).is(":checked"));
    if (!$(this).is(":checked")) hideIndicator();
  });

  $("#yn_show_streaming").on("change", function () {
    saveSetting("show_streaming", $(this).is(":checked"));
  });

  $("#yn_show_avatar").on("change", function () {
    saveSetting("show_avatar", $(this).is(":checked"));
  });

  $("#yn_position").on("change", function () {
    saveSetting("position", $(this).val());
  });

  $("#yn_animation").on("change", function () {
    saveSetting("animation", $(this).val());
  });

  $("#yn_name_color").on("input change", function () {
    saveSetting("name_color", $(this).val());
  });

  $("#yn_text").on("input change", function () {
    saveSetting("text", $(this).val());
  });

  eventSource.on(event_types.GENERATION_STARTED, showIndicator);
  eventSource.on(event_types.GENERATION_ENDED, hideIndicator);
  eventSource.on(event_types.MESSAGE_RECEIVED, hideIndicator);
  eventSource.on(event_types.GENERATION_STOPPED, hideIndicator);

  eventSource.on(event_types.STREAM_TOKEN_RECEIVED, () => {
    if (extension_settings[extensionName]?.show_streaming && !isGenerating) {
      showIndicator();
    }
  });

  console.log("[y-ntyping] Loaded v1.0.1");
});