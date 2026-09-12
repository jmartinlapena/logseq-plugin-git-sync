import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";

export const COMMON_STYLE = `
.ui-items-container[data-type=toolbar] > .list-wrap {
  overflow: visible;
}
#injected-ui-item-git-logseq-git {
  position: relative;
}
.plugin-git-container {
  display: none;
}
.plugin-git-container .plugin-git-mask {
  position: fixed;
  width: 100vw;
  height: 100vh;
  left: 0;
  top: 0;
  z-index: 99;
}
.plugin-git-container .plugin-git-popup {
  position: fixed;
  z-index: 99;
  background-color: var(--ls-secondary-background-color);
  padding: 10px;
  border-radius: .375rem;
  --tw-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),0 4px 6px -2px rgba(0, 0, 0, 0.05);
  box-shadow: var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);
}
.plugin-git-container .plugin-git-popup::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 10px 8px 10px;
  border-color: transparent transparent var(--ls-secondary-background-color) transparent;
}
`;

export const SHOW_POPUP_STYLE = `
.plugin-git-container {
  display: block;
}
`;
export const HIDE_POPUP_STYLE = `
.plugin-git-container {
  display: none;
}
`;

export const INACTIVE_STYLE = `
${COMMON_STYLE}
#injected-ui-item-git-logseq-git::after {
  display: none;
}
`;
export const ACTIVE_STYLE = `
${COMMON_STYLE}
#injected-ui-item-git-logseq-git::after {
  display: block;
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 100%;
  background-color: rgb(237, 66, 69);
  right: 8px;
  top: 6px;
}
`;

export const LOADING_STYLE = `
${COMMON_STYLE}
#injected-ui-item-git-logseq-git::after {
  display: block;
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 100%;
  background-color: rgb(237, 66, 69);
  right: 8px;
  top: 6px;
  animation: blink 1s linear infinite;
}
@keyframes blink {
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
}
`;

export const BUTTONS = [
  { key: "status", title: "Check Status", event: "check" },
  { key: "sync", title: "Sync Now", event: "sync" },
  { key: "log", title: "Show Log", event: "log" },
  { key: "pull", title: "Pull", event: "pull" },
  { key: "pullRebase", title: "Pull Rebase", event: "pullRebase" },
  { key: "checkout", title: "Checkout", event: "checkout" },
  { key: "commit", title: "Commit", event: "commit" },
  { key: "push", title: "Push", event: "push" },
  { key: "commitAndPush", title: "Commit & Sync", event: "commitAndPush" },
];

export const SETTINGS_SCHEMA: SettingSchemaDesc[] = [
  {
    key: "buttons",
    title: "Buttons",
    type: "enum",
    default: ["Check Status", "Sync Now", "Show Log", "Pull Rebase", "Commit & Sync"],
    description: "Select buttons to show",
    enumPicker: "checkbox",
    enumChoices: BUTTONS.map(({ title }) => title),
  },
  {
    key: "checkWhenDBChanged",
    title: "Check Status when DB Changed",
    type: "boolean",
    default: true,
    description: "Update the toolbar status indicator when Logseq data changes",
  },
  {
    key: "autoCheckSynced",
    title: "Auto Check If Synced",
    type: "boolean",
    default: false,
    description: "Run the legacy local/remote equality check automatically",
  },
  {
    key: "autoSyncOnStartup",
    title: "Auto Sync on Startup",
    type: "boolean",
    default: true,
    description: "Safely synchronize the current graph when the plugin starts",
  },
  {
    key: "autoSyncOnFocus",
    title: "Auto Sync on Focus",
    type: "boolean",
    default: true,
    description: "Safely synchronize when Logseq regains operating-system focus",
  },
  {
    key: "autoSyncOnGraphChange",
    title: "Auto Sync when Graph Changes",
    type: "boolean",
    default: true,
    description: "Safely synchronize after switching to another graph",
  },
  {
    key: "autoCommitAndSyncOnChange",
    title: "Auto Commit & Sync after Changes",
    type: "boolean",
    default: true,
    description: "Commit and safely synchronize after Logseq has been idle following an edit",
  },
  {
    key: "autoCommitDelaySeconds",
    title: "Auto Commit Delay (seconds)",
    type: "number",
    default: 10,
    description: "Seconds without a new DB change before automatically committing and synchronizing",
  },
  {
    key: "periodicSync",
    title: "Periodic Safety Sync",
    type: "boolean",
    default: true,
    description: "Periodically verify the repository and commit/synchronize anything still pending",
  },
  {
    key: "periodicSyncIntervalSeconds",
    title: "Periodic Sync Interval (seconds)",
    type: "number",
    default: 60,
    description: "Safety interval used even while Logseq stays open in the foreground",
  },
  {
    key: "autoPush",
    title: "Auto Commit & Sync when Hidden",
    type: "boolean",
    default: true,
    description: "Commit local changes and safely synchronize when Logseq becomes hidden or minimized",
  },
  {
    key: "typeCommitMessage",
    title: "Type Commit Message",
    type: "enum",
    default: "Default Message With Date",
    description: "Type of commit message to use",
    enumPicker: "select",
    enumChoices: [
      "Custom Message",
      "Default Message",
      "Custom Message With Date",
      "Default Message With Date",
    ],
  },
  {
    key: "customCommitMessage",
    title: "Custom Commit Message",
    type: "string",
    default: "",
    description: "Custom commit message for plugin (valid only if commit message is set to Custom Message)",
  },
];
