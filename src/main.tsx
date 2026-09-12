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
    let autoCommitTimer: ReturnType<typeof setTimeout> | undefined;
    let periodicTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const readSecondsSetting = (
      key: string,
      fallback: number,
      min: number,
      max: number
    ) => {
      const raw = Number(logseq.settings?.[key]);
      if (!Number.isFinite(raw)) return fallback;
      return Math.min(max, Math.max(min, raw));
    };

    const autoCommitDelayMs = () =>
      readSecondsSetting("autoCommitDelaySeconds", 10, 2, 3600) * 1000;

    const periodicIntervalMs = () =>
      readSecondsSetting("periodicSyncIntervalSeconds", 60, 15, 86400) * 1000;

    const runWorkflow = async (
      commitLocalChanges: boolean,
      showSuccess = false,
      showLoading = false
    ) => {
      if (showLoading) setPluginStyle(LOADING_STYLE);
      try {
        return commitLocalChanges
          ? await commitAndSync(showSuccess)
          : await safeSync(showSuccess);
      } finally {
        await checkStatus();
      }
    };

    const automaticWorkflow = async (showLoading = false) => {
      const shouldCommit = Boolean(logseq.settings?.autoCommitAndSyncOnChange);
      return runWorkflow(shouldCommit, false, showLoading);
    };

    const runAutoSync = debounce(async function () {
      await automaticWorkflow(true);
    }, 500);

    const runFocusSync = debounce(async function () {
      if (!logseq.settings?.autoSyncOnFocus) return;
      if (logseq.settings?.autoCheckSynced) checkIsSynced();
      await automaticWorkflow(true);
    }, 300);

    const scheduleAutoCommitAndSync = () => {
      if (!logseq.settings?.autoCommitAndSyncOnChange) return;

      if (autoCommitTimer) clearTimeout(autoCommitTimer);
      autoCommitTimer = setTimeout(async () => {
        autoCommitTimer = undefined;
        if (disposed || !logseq.settings?.autoCommitAndSyncOnChange) return;
        await runWorkflow(true, false, false);
      }, autoCommitDelayMs());
    };

    const schedulePeriodicSafetySync = () => {
      if (disposed) return;
      if (periodicTimer) clearTimeout(periodicTimer);

      periodicTimer = setTimeout(async () => {
        periodicTimer = undefined;
        if (disposed) return;

        if (logseq.settings?.periodicSync) {
          const shouldCommit = Boolean(logseq.settings?.autoCommitAndSyncOnChange);
          await runWorkflow(shouldCommit, false, false);
        }

        schedulePeriodicSafetySync();
      }, periodicIntervalMs());
    };

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
        await runWorkflow(false, true, false);
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
        await runWorkflow(true, true, false);
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

    logseq.DB.onChanged(() => {
      if (logseq.settings?.checkWhenDBChanged) checkStatusWithDebounce();
      if (logseq.settings?.autoCommitAndSyncOnChange) scheduleAutoCommitAndSync();
    });

    if (logseq.settings?.autoCheckSynced) checkIsSynced();
    checkStatusWithDebounce();

    if (logseq.settings?.autoSyncOnStartup) {
      setTimeout(() => runAutoSync(), 1200);
    }

    logseq.App.onCurrentGraphChanged(() => {
      if (autoCommitTimer) {
        clearTimeout(autoCommitTimer);
        autoCommitTimer = undefined;
      }
      if (logseq.settings?.autoSyncOnGraphChange) {
        setTimeout(() => runAutoSync(), 500);
      }
    });

    const handleWindowFocus = () => {
      runFocusSync();
    };

    const handleVisibilityChange = async () => {
      const visibilityState = top?.document?.visibilityState;

      if (visibilityState === "visible") {
        runFocusSync();
      } else if (visibilityState === "hidden" && logseq.settings?.autoPush) {
        await runWorkflow(true, false, true);
      }
    };

    if (top) {
      top.addEventListener("focus", handleWindowFocus);
      top.document?.addEventListener("visibilitychange", handleVisibilityChange);
    }

    schedulePeriodicSafetySync();

    logseq.beforeunload(async () => {
      disposed = true;
      if (autoCommitTimer) clearTimeout(autoCommitTimer);
      if (periodicTimer) clearTimeout(periodicTimer);
      if (top) {
        top.removeEventListener("focus", handleWindowFocus);
        top.document?.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    });

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
