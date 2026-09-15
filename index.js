import { extension_settings, getContext } from "../../../extensions.js";
import {
    saveSettingsDebounced,
    eventSource,
    event_types
} from "../../../../script.js";

const extensionName = "y-ntyping";
const extensionFolderPath =
    `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = {
    enabled: true,
    show_streaming: true,
    show_avatar: false,

    position: "bottom",
    animation: "bounce",

    default_color: "#7dffb3",
    text: "is typing...",

    font_size: 15,
    name_size: 15,
    gap: 7,

    offset_x: 0,
    offset_y: 0,

    avatar_size: 28,

    characters: {},
};

let indicatorEl = null;
let isGenerating = false;
let activeCharacterName = "";


/* =========================================================
   SETTINGS
========================================================= */

function getSettings() {
    extension_settings[extensionName] =
        extension_settings[extensionName] || {};

    const settings =
        extension_settings[extensionName];

    for (const [key, value] of Object.entries(defaultSettings)) {
        if (settings[key] === undefined) {
            settings[key] =
                value && typeof value === "object"
                    ? { ...value }
                    : value;
        }
    }

    if (
        !settings.characters ||
        typeof settings.characters !== "object"
    ) {
        settings.characters = {};
    }

    return settings;
}


function saveSetting(key, value) {
    const settings = getSettings();

    settings[key] = value;

    saveSettingsDebounced();

    updateIndicator();
    renderCharacterSettings();
}


/* =========================================================
   CHARACTER
========================================================= */

function cleanName(name) {
    if (!name) {
        return "Character";
    }

    return String(name)
        .replace(
            /\.(png|jpe?g|webp|gif|svg|bmp)$/i,
            ""
        )
        .trim() || "Character";
}


function getCharacterNamesInCurrentChat() {
    const ctx = getContext();

    if (!ctx) {
        return [];
    }


    /* GROUP CHAT */

    if (
        ctx.groupId &&
        Array.isArray(ctx.groups)
    ) {
        const group = ctx.groups.find(
            g => g.id === ctx.groupId
        );

        if (
            group &&
            Array.isArray(group.members)
        ) {
            return group.members
                .map(member => {
                    const found =
                        ctx.characters?.find(
                            c =>
                                c.avatar === member ||
                                c.name === member
                        );

                    return cleanName(
                        found?.name || member
                    );
                })
                .filter(Boolean);
        }
    }


    /* SINGLE CHAT */

    if (
        ctx.characters &&
        ctx.characterId != null
    ) {
        const character =
            ctx.characters[ctx.characterId];

        if (character?.name) {
            return [
                cleanName(character.name)
            ];
        }
    }


    if (ctx.name2) {
        return [
            cleanName(ctx.name2)
        ];
    }

    return [];
}


function getCurrentCharName() {
    const ctx = getContext();

    if (activeCharacterName) {
        return activeCharacterName;
    }

    if (!ctx) {
        return "Character";
    }


    /* SINGLE CHARACTER */

    if (
        ctx.characters &&
        ctx.characterId != null
    ) {
        const character =
            ctx.characters[ctx.characterId];

        if (character?.name) {
            return cleanName(character.name);
        }
    }


    if (ctx.name2) {
        return cleanName(ctx.name2);
    }

    return "Character";
}


/* =========================================================
   AVATAR
========================================================= */

function getAvatarForCharacter(name) {
    const ctx = getContext();

    if (!ctx?.characters) {
        return "";
    }

    const character =
        ctx.characters.find(
            c =>
                cleanName(c.name) ===
                cleanName(name)
        );

    if (!character?.avatar) {
        return "";
    }

    return `/characters/${character.avatar}`;
}


function getCurrentAvatar() {
    return getAvatarForCharacter(
        getCurrentCharName()
    );
}


/* =========================================================
   COLORS
========================================================= */

function getCharacterColor(name) {
    const settings = getSettings();

    const character =
        settings.characters?.[
            cleanName(name)
        ];

    return (
        character?.color ||
        settings.default_color ||
        "#7dffb3"
    );
}


/* =========================================================
   INDICATOR
========================================================= */

function createIndicator() {
    if (indicatorEl) {
        return;
    }

    indicatorEl =
        document.createElement("div");

    indicatorEl.id =
        "yn-typing-indicator";

    indicatorEl.innerHTML = `
        <img
            class="yn-avatar"
            src=""
            alt=""
        >

        <span class="yn-name"></span>

        <span class="yn-text"></span>

        <span class="yn-dots">
            <span class="yn-dot"></span>
            <span class="yn-dot"></span>
            <span class="yn-dot"></span>
        </span>
    `;

    const chat =
        document.getElementById("chat");

    if (chat?.parentNode) {
        chat.parentNode.insertBefore(
            indicatorEl,
            chat.nextSibling
        );
    } else {
        document.body.appendChild(
            indicatorEl
        );
    }
}


function updateIndicator() {
    if (!indicatorEl) {
        return;
    }

    const settings = getSettings();

    const name =
        getCurrentCharName();

    const color =
        getCharacterColor(name);


    /*
     * IMPORTANT:
     * Ne jamais supprimer la classe "visible"
     * ici. Cette fonction sert uniquement à
     * mettre à jour le style.
     */

    indicatorEl.classList.remove(
        "position-bottom",
        "position-top",
        "position-left",
        "position-right"
    );

    indicatorEl.classList.remove(
        "anim-bounce",
        "anim-pulse",
        "anim-fade",
        "anim-none"
    );


    indicatorEl.classList.add(
        `position-${settings.position}`
    );

    indicatorEl.classList.add(
        `anim-${settings.animation}`
    );


    indicatorEl.classList.toggle(
        "show-avatar",
        !!settings.show_avatar
    );


    indicatorEl.style.setProperty(
        "--yn-name-color",
        color
    );

    indicatorEl.style.setProperty(
        "--yn-font-size",
        `${Number(settings.font_size) || 15}px`
    );

    indicatorEl.style.setProperty(
        "--yn-name-size",
        `${Number(settings.name_size) || 15}px`
    );

    indicatorEl.style.setProperty(
        "--yn-gap",
        `${Number(settings.gap) || 7}px`
    );

    indicatorEl.style.setProperty(
        "--yn-offset-x",
        `${Number(settings.offset_x) || 0}px`
    );

    indicatorEl.style.setProperty(
        "--yn-offset-y",
        `${Number(settings.offset_y) || 0}px`
    );

    indicatorEl.style.setProperty(
        "--yn-avatar-size",
        `${Number(settings.avatar_size) || 28}px`
    );
}


/* =========================================================
   SHOW
========================================================= */

function showIndicator() {
    const settings = getSettings();

    if (!settings.enabled) {
        return;
    }

    if (!indicatorEl) {
        createIndicator();
    }


    const name =
        getCurrentCharName();

    const text =
        String(
            settings.text ||
            "is typing..."
        ).replace(
            /\{\{char\}\}/gi,
            name
        );


    indicatorEl.querySelector(
        ".yn-name"
    ).textContent = name;


    indicatorEl.querySelector(
        ".yn-text"
    ).textContent = ` ${text}`;


    const avatar =
        indicatorEl.querySelector(
            ".yn-avatar"
        );


    if (settings.show_avatar) {
        const src =
            getCurrentAvatar();

        avatar.src =
            src || "";

        avatar.style.display =
            src
                ? "block"
                : "none";
    } else {
        avatar.style.display =
            "none";
    }


    updateIndicator();


    /*
     * C'est ici uniquement que l'indicateur
     * devient visible.
     */
    indicatorEl.classList.add(
        "visible"
    );

    isGenerating = true;
}


/* =========================================================
   HIDE
========================================================= */

function hideIndicator() {
    if (indicatorEl) {
        indicatorEl.classList.remove(
            "visible"
        );
    }

    isGenerating = false;

    activeCharacterName = "";
}


/* =========================================================
   CHARACTER SETTINGS UI
========================================================= */

function renderCharacterSettings() {
    const container =
        document.getElementById(
            "yn_character_list"
        );

    if (!container) {
        return;
    }


    const names =
        getCharacterNamesInCurrentChat();

    const settings =
        getSettings();


    container.innerHTML = "";


    if (!names.length) {
        container.innerHTML = `
            <div class="opacity50 yn-empty">
                Open a character or group chat
                to configure its typing color.
            </div>
        `;

        return;
    }


    for (const name of names) {
        const row =
            document.createElement("div");

        row.className =
            "yn-character-row";


        row.innerHTML = `
            <span class="yn-character-name"></span>

            <input
                type="color"
                class="yn-character-color"
                title="Typing indicator color"
            >

            <button
                type="button"
                class="menu_button yn-reset-character"
                title="Reset color"
            >
                ↺
            </button>
        `;


        row.querySelector(
            ".yn-character-name"
        ).textContent = name;


        row.querySelector(
            ".yn-character-color"
        ).value =
            getCharacterColor(name);


        row.querySelector(
            ".yn-character-color"
        ).addEventListener(
            "input",
            event => {

                settings.characters[name] = {
                    ...(settings.characters[name] || {}),
                    color:
                        event.target.value
                };

                saveSettingsDebounced();


                if (
                    isGenerating &&
                    getCurrentCharName() === name
                ) {
                    updateIndicator();
                }
            }
        );


        row.querySelector(
            ".yn-reset-character"
        ).addEventListener(
            "click",
            () => {

                delete settings.characters[name];

                saveSettingsDebounced();

                renderCharacterSettings();


                if (isGenerating) {
                    updateIndicator();
                }
            }
        );


        container.appendChild(row);
    }
}


/* =========================================================
   LOAD SETTINGS
========================================================= */

async function loadSettings() {
    const settings =
        getSettings();


    $("#yn_enabled")
        .prop(
            "checked",
            settings.enabled
        );


    $("#yn_show_streaming")
        .prop(
            "checked",
            settings.show_streaming
        );


    $("#yn_show_avatar")
        .prop(
            "checked",
            settings.show_avatar
        );


    $("#yn_position")
        .val(
            settings.position
        );


    $("#yn_animation")
        .val(
            settings.animation
        );


    $("#yn_default_color")
        .val(
            settings.default_color
        );


    $("#yn_text")
        .val(
            settings.text
        );


    $("#yn_font_size")
        .val(
            settings.font_size
        );


    $("#yn_name_size")
        .val(
            settings.name_size
        );


    $("#yn_gap")
        .val(
            settings.gap
        );


    $("#yn_offset_x")
        .val(
            settings.offset_x
        );


    $("#yn_offset_y")
        .val(
            settings.offset_y
        );


    $("#yn_avatar_size")
        .val(
            settings.avatar_size
        );


    renderCharacterSettings();

    updateIndicator();
}


/* =========================================================
   INIT
========================================================= */

jQuery(async () => {

    try {
        const html =
            await $.get(
                `${extensionFolderPath}/setting.html`
            );

        $("#extensions_settings2")
            .append(html);

    } catch (error) {

        console.warn(
            "[y-ntyping] Could not load setting.html",
            error
        );
    }


    await loadSettings();

    createIndicator();


    /* =====================================================
       BASIC SETTINGS
    ===================================================== */

    $("#yn_enabled").on(
        "change",
        function () {

            const enabled =
                $(this).is(":checked");

            saveSetting(
                "enabled",
                enabled
            );

            if (!enabled) {
                hideIndicator();
            }
        }
    );


    $("#yn_show_streaming").on(
        "change",
        function () {

            saveSetting(
                "show_streaming",
                $(this).is(":checked")
            );
        }
    );


    $("#yn_show_avatar").on(
        "change",
        function () {

            saveSetting(
                "show_avatar",
                $(this).is(":checked")
            );
        }
    );


    $("#yn_position").on(
        "change",
        function () {

            saveSetting(
                "position",
                $(this).val()
            );
        }
    );


    $("#yn_animation").on(
        "change",
        function () {

            saveSetting(
                "animation",
                $(this).val()
            );
        }
    );


    $("#yn_default_color").on(
        "input change",
        function () {

            saveSetting(
                "default_color",
                $(this).val()
            );
        }
    );


    $("#yn_text").on(
        "input change",
        function () {

            saveSetting(
                "text",
                $(this).val()
            );
        }
    );


    $("#yn_font_size").on(
        "input change",
        function () {

            saveSetting(
                "font_size",
                Number($(this).val())
            );
        }
    );


    $("#yn_name_size").on(
        "input change",
        function () {

            saveSetting(
                "name_size",
                Number($(this).val())
            );
        }
    );


    $("#yn_gap").on(
        "input change",
        function () {

            saveSetting(
                "gap",
                Number($(this).val())
            );
        }
    );


    $("#yn_offset_x").on(
        "input change",
        function () {

            saveSetting(
                "offset_x",
                Number($(this).val())
            );
        }
    );


    $("#yn_offset_y").on(
        "input change",
        function () {

            saveSetting(
                "offset_y",
                Number($(this).val())
            );
        }
    );


    $("#yn_avatar_size").on(
        "input change",
        function () {

            saveSetting(
                "avatar_size",
                Number($(this).val())
            );
        }
    );


    $("#yn_refresh_characters")
        .on(
            "click",
            renderCharacterSettings
        );


    /* =====================================================
       GROUP CHARACTER DETECTION
    ===================================================== */

    if (event_types.GROUP_MEMBER_DRAFTED) {

        eventSource.on(
            event_types.GROUP_MEMBER_DRAFTED,
            chId => {

                const ctx =
                    getContext();

                const character =
                    ctx?.characters?.[chId];


                if (character?.name) {
                    activeCharacterName =
                        cleanName(
                            character.name
                        );
                }


                renderCharacterSettings();

                /*
                 * On ne lance PLUS jamais
                 * l'indicateur ici.
                 */
            }
        );
    }


    /* =====================================================
       GENERATION
    ===================================================== */

    /*
     * IMPORTANT :
     *
     * L'indicateur démarre UNIQUEMENT ici.
     *
     * On ne l'appelle plus depuis
     * STREAM_TOKEN_RECEIVED.
     */

    if (event_types.GENERATION_STARTED) {

        eventSource.on(
            event_types.GENERATION_STARTED,
            () => {

                /*
                 * Une vraie génération vient
                 * de commencer.
                 */
                showIndicator();
            }
        );
    }


    /* =====================================================
       GENERATION END
    ===================================================== */

    if (event_types.GENERATION_ENDED) {

        eventSource.on(
            event_types.GENERATION_ENDED,
            () => {
                hideIndicator();
            }
        );
    }


    /* =====================================================
       GENERATION STOPPED
    ===================================================== */

    if (event_types.GENERATION_STOPPED) {

        eventSource.on(
            event_types.GENERATION_STOPPED,
            () => {
                hideIndicator();
            }
        );
    }


    /* =====================================================
       MESSAGE RECEIVED
    ===================================================== */

    if (event_types.MESSAGE_RECEIVED) {

        eventSource.on(
            event_types.MESSAGE_RECEIVED,
            () => {

                /*
                 * Sécurité supplémentaire :
                 * dès que la réponse est reçue,
                 * l'indicateur disparaît.
                 */
                hideIndicator();
            }
        );
    }


    /* =====================================================
       CHAT CHANGED
    ===================================================== */

    if (event_types.CHAT_CHANGED) {

        eventSource.on(
            event_types.CHAT_CHANGED,
            () => {

                activeCharacterName = "";

                /*
                 * Un changement de conversation
                 * doit toujours supprimer
                 * l'indicateur.
                 */
                hideIndicator();

                renderCharacterSettings();

                updateIndicator();
            }
        );
    }


    console.log(
        "[y-ntyping] Loaded v1.2.1 - generation-only typing indicator"
    );
});