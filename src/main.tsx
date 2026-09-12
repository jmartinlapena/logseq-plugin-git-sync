import "@logseq/libs";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { BUTTONS, LOADING_STYLE, SETTINGS_SCHEMA } from "./helper/constants";
import {
  checkout,
  commit,
  commitMessage,
  log,
  pull,
  pullRebase,
  push,
} from "./helper/git";
import { commitAndSync, safeSync } from "./helper/sync";
import {
  checkStatus,
  debounce,
  hidePopup,
  setPluginStyle,
  showPopup,
  checkIsSynced,
  checkStatusWithDebounce,
} from "./helper/util";
import "./index.css";

// TODO: patch logseq Git command for the temporary fix solution
// https://github.com/haydenull/logseq-plugin-git/issues/48
try {
  // @ts-ignore
  top.logseq.sdk.git.exec_command(["status"]);
} catch (e) {
  // @ts-ignore
  logseq.Git["execCommand"] = async function (args: string[]) {
    const ret = await logseq.App.execGitCommand(args);
    return { exitCode: ret == undefined ? 1 : 0, stdout: ret, stderr: "" };
  };
}

const isDevelopment = import.meta.env.DEV;

if (isDevelopment) {
  renderApp("browser");
} else {
  console.log("=== logseq-plugin-git loaded ===");
  logseq.ready(() => {
    const runAutoSync = debounce(async function () {
      setPluginStyle(LOADING_STYLE);
      try {
        await safeSync(false);
      } finally {
        await checkStatus();
      }
    }, 500);

    const operations = {
      check: debounce(async function () {
        const status = await checkStatus();
        if (status?.stdout === "") {
          logseq.UI.showMsg("No changes detected.");
        } else {
          logseq.UI.showMsg("Changes detected:\n" + status.stdout, "success", {
            timeout: 0,
          });
        }
        hidePopup();
      }),
      sync: debounce(async function () {
        setPluginStyle(LOADING_STYLE);
        hidePopup();
        try {
          await safeSync(true);
        } finally {
          await checkStatus();
        }
      }),
      pull: debounce(async function () {
        console.log("[logseq-git:] === pull click");
        setPluginStyle(LOADING_STYLE);
        hidePopup();
        await pull(false);
        checkStatus();
      }),
      pullRebase: debounce(async function () {
        console.log("[logseq-git:] === pullRebase click");
        setPluginStyle(LOADING_STYLE);
        hidePopup();
        await pullRebase();
        checkStatus();
      }),
      checkout: debounce(async function () {
        console.log("[logseq-git:] === checkout click");
        hidePopup();
        checkout();
      }),
      commit: debounce(async function () {
        hidePopup();
        await commit(true, commitMessage());
        checkStatus();
      }),
      push: debounce(async function () {
        setPluginStyle(LOADING_STYLE);
        hidePopup();
        await push();
        checkStatus();
      }),
      commitAndPush: debounce(async function () {
        setPluginStyle(LOADING_STYLE);
        hidePopup();
        try {
          await commitAndSync(true);
        } finally {
          await checkStatus();
        }
      }),
      log: debounce(async function () {
        console.log("[logseq-git:] === log click");
        const res = await log(false);
        logseq.UI.showMsg(res?.stdout, "success", { timeout: 0 });
        hidePopup();
      }),
      showPopup: debounce(async function () {
        console.log("[logseq-git:] === showPopup click");
        showPopup();
      }),
      hidePopup: debounce(function () {
        console.log("[logseq-git:] === hidePopup click");
        hidePopup();
      }),
    };

    logseq.provideModel(operations);

    logseq.App.registerUIItem("toolbar", {
      key: "git",
      template:
        '<a data-on-click="showPopup" class="button"><i class="ti ti-brand-git"></i></a><div id="plugin-git-content-wrapper"></div>',
    });
    logseq.useSettingsSchema(SETTINGS_SCHEMA);

    setTimeout(() => {
      const buttons = (logseq.settings?.buttons as string[])
        ?.map((title) => BUTTONS.find((b) => b.title === title))
        .filter(Boolean);
      if (top && buttons?.length) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(
          `
          <div class="plugin-git-container">
            <div class="plugin-git-mask"></div>
            <div class="plugin-git-popup flex flex-col">
              ${buttons
                .map(
                  (button) =>
                    `<button class="ui__button plugin-git-${button?.key} bg-indigo-600 hover:bg-indigo-700 focus:border-indigo-700 active:bg-indigo-700 text-center text-sm p-1" style="margin: 4px 0; color: #fff;">${button?.title}</button>`
                )
                .join("\n")}
          </div>
          `,
          "text/html"
        );
        const container = top?.document?.querySelector(".plugin-git-container");
        console.log("[logseq-git:] === container", container);
        if (container) top?.document?.body.removeChild(container);
        top?.document?.body.appendChild(doc.body.childNodes?.[0]?.cloneNode(true));
        top?.document
          ?.querySelector(".plugin-git-mask")
          ?.addEventListener("click", hidePopup);
        buttons.forEach((button) => {
          top?.document
            ?.querySelector(`.plugin-git-${button?.key}`)
            ?.addEventListener("click", operations?.[button!?.event]);
        });
      }
    }, 1000);

    logseq.App.onRouteChanged(async () => {
      checkStatusWithDebounce();
    });

    if (logseq.settings?.checkWhenDBChanged) {
      logseq.DB.onChanged(() => {
        checkStatusWithDebounce();
      });
    }

    if (logseq.settings?.autoCheckSynced) checkIsSynced();
    checkStatusWithDebounce();

    if (logseq.settings?.autoSyncOnStartup) {
      setTimeout(() => runAutoSync(), 1200);
    }

    logseq.App.onCurrentGraphChanged(() => {
      if (logseq.settings?.autoSyncOnGraphChange) {
        setTimeout(() => runAutoSync(), 500);
      }
    });

    if (top) {
      top.document?.addEventListener("visibilitychange", async () => {
        const visibilityState = top?.document?.visibilityState;

        if (visibilityState === "visible") {
          if (logseq.settings?.autoCheckSynced) checkIsSynced();
          if (logseq.settings?.autoSyncOnFocus) runAutoSync();
        } else if (visibilityState === "hidden") {
          if (logseq.settings?.autoPush) {
            setPluginStyle(LOADING_STYLE);
            try {
              await commitAndSync(false);
            } finally {
              await checkStatus();
            }
          }
        }
      });
    }

    logseq.App.registerCommandPalette(
      {
        key: "logseq-plugin-git:commit",
        label: "Commit",
        keybinding: {
          binding: "alt+shift+s",
          mode: "global",
        },
      },
      () => operations.commit()
    );

    logseq.App.registerCommandPalette(
      {
        key: "logseq-plugin-git:commit&push",
        label: "Commit & Sync",
        keybinding: {
          binding: "mod+s",
          mode: "global",
        },
      },
      () => operations.commitAndPush()
    );

    logseq.App.registerCommandPalette(
      {
        key: "logseq-plugin-git:rebase",
        label: "Pull Rebase",
        keybinding: {
          binding: "mod+alt+s",
          mode: "global",
        },
      },
      () => operations.pullRebase()
    );
  });
}

function renderApp(env: string) {
  ReactDOM.render(
    <React.StrictMode>
      <App env={env} />
    </React.StrictMode>,
    document.getElementById("root")
  );
}
