// https://logseq.github.io/plugins/interfaces/IAppProxy.html#execGitCommand
import type { IGitResult } from "@logseq/libs/dist/LSPlugin.user"

let _inProgress: Promise<IGitResult> | undefined = undefined

export const execGitCommand = async (args: string[]): Promise<IGitResult> => {
  if (_inProgress) await _inProgress

  let res
  try {
    const currentGitFolder = (await logseq.App.getCurrentGraph())?.path
    const runArgs = currentGitFolder ? ["-C", currentGitFolder, ...args] : args
    _inProgress = logseq.Git.execCommand(runArgs)
    res = await _inProgress
  } finally {
    _inProgress = undefined
  }
  return res
}

export const inProgress = () => _inProgress

export const status = async (showRes = true): Promise<IGitResult> => {
  const res = await execGitCommand(["status", "--porcelain"])
  console.log("[logseq-git:] === git status", res)
  if (showRes) {
    if (res.exitCode === 0) {
      logseq.UI.showMsg("Git status success")
    } else {
      logseq.UI.showMsg(`Git status failed\n${res.stderr}`, "error")
    }
  }
  return res
}

export const log = async (showRes = true): Promise<IGitResult> => {
  const res = await execGitCommand([
    "log",
    '--pretty=format:"%h %ad | %s [%an]"',
    '--date=format:"%Y-%m-%d %H:%M:%S"',
    "--name-status",
  ])
  console.log("[logseq-git:] === git log", res)
  if (showRes) {
    if (res.exitCode === 0) {
      logseq.UI.showMsg("Git log success")
    } else {
      logseq.UI.showMsg(`Git log failed\n${res.stderr}`, "error")
    }
  }
  return res
}

export const fetchRemote = async (showRes = false): Promise<IGitResult> => {
  const res = await execGitCommand(["fetch", "--prune"])
  console.log("[logseq-git:] === git fetch --prune", res)
  if (showRes) {
    if (res.exitCode === 0) {
      logseq.UI.showMsg("Git fetch success")
    } else {
      logseq.UI.showMsg(`Git fetch failed\n${res.stderr}`, "error")
    }
  }
  return res
}

export const pull = async (showRes = true): Promise<IGitResult> => {
  const res = await execGitCommand(["pull"])
  console.log("[logseq-git:] === git pull", res)
  if (showRes) {
    if (res.exitCode === 0) {
      logseq.UI.showMsg("Git pull success")
    } else {
      logseq.UI.showMsg(`Git pull failed\n${res.stderr}`, "error")
    }
  }
  return res
}

export const pullFastForward = async (showRes = true): Promise<IGitResult> => {
  const res = await execGitCommand(["pull", "--ff-only"])
  console.log("[logseq-git:] === git pull --ff-only", res)
  if (showRes) {
    if (res.exitCode === 0) {
      logseq.UI.showMsg("Git fast-forward pull success")
    } else {
      logseq.UI.showMsg(`Git fast-forward pull failed\n${res.stderr}`, "error")
    }
  }
  return res
}

export const pullRebase = async (showRes = true): Promise<IGitResult> => {
  const res = await execGitCommand(["pull", "--rebase"])
  console.log("[logseq-git:] === git pull --rebase", res)
  if (showRes) {
    if (res.exitCode === 0) {
      logseq.UI.showMsg("Git pull --rebase success")
    } else {
      logseq.UI.showMsg(`Git pull --rebase failed\n${res.stderr}`, "error")
    }
  }
  return res
}

export const checkout = async (showRes = true): Promise<IGitResult> => {
  const res = await execGitCommand(["checkout", "."])
  console.log("[logseq-git:] === git checkout .", res)
  if (showRes) {
    if (res.exitCode === 0) {
      logseq.UI.showMsg("Git checkout success")
    } else {
      logseq.UI.showMsg(`Git checkout failed\n${res.stderr}`, "error")
    }
  }
  return res
}

export const commit = async (
  showRes = true,
  message: string
): Promise<IGitResult> => {
  await execGitCommand(["add", "."])
  const res = await execGitCommand(["commit", "-m", message])
  console.log("[logseq-git:] === git commit", res)
  if (showRes) {
    if (res.exitCode === 0) {
      logseq.UI.showMsg("Git commit success")
    } else {
      logseq.UI.showMsg(`Git commit failed\n${res.stdout || res.stderr}`, "error")
    }
  }
  return res
}

export const push = async (showRes = true): Promise<IGitResult> => {
  const res = await execGitCommand(["push"])
  console.log("[logseq-git:] === git push", res)
  if (showRes) {
    if (res.exitCode === 0) {
      logseq.UI.showMsg("Git push success")
    } else {
      logseq.UI.showMsg(`Git push failed\n${res.stderr}`, "error")
    }
  }
  return res
}

export const commitMessage = (): string => {
  const defaultMessage = "[logseq-plugin-git:commit]"

  switch (logseq.settings?.typeCommitMessage as string) {
    case "Default Message":
      return defaultMessage
    case "Default Message With Date":
      return defaultMessage + " " + new Date().toISOString()
    case "Custom Message": {
      const customMessage = logseq.settings?.customCommitMessage as string
      return customMessage.trim() === "" ? defaultMessage : customMessage
    }
    case "Custom Message With Date": {
      const customMessageWithDate = logseq.settings?.customCommitMessage as string
      return customMessageWithDate.trim() === ""
        ? defaultMessage + " " + new Date().toISOString()
        : customMessageWithDate + " " + new Date().toISOString()
    }
    default:
      return defaultMessage
  }
}
