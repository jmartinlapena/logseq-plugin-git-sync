import type { IGitResult } from "@logseq/libs/dist/LSPlugin.user"
import {
  commit,
  commitMessage,
  execGitCommand,
  fetchRemote,
  pullFastForward,
  push,
  status,
} from "./git"

export type SyncRelation = "synced" | "ahead" | "behind" | "diverged" | "unknown"
export type SyncAction = "none" | "pulled" | "pushed" | "skipped" | "error"

export interface RepositorySyncState {
  dirty: boolean
  ahead: number
  behind: number
  relation: SyncRelation
  error?: string
}

export interface SyncResult {
  action: SyncAction
  state: RepositorySyncState
  error?: string
}

let workflowInProgress: Promise<SyncResult> | undefined

const unknownState = (error: string, dirty = false): RepositorySyncState => ({
  dirty,
  ahead: 0,
  behind: 0,
  relation: "unknown",
  error,
})

const gitError = (result: IGitResult, fallback: string) =>
  (result.stderr || result.stdout || fallback).trim()

const showWarning = (message: string) =>
  logseq.UI.showMsg(message, "warning", { timeout: 0 })

const showError = (message: string) =>
  logseq.UI.showMsg(message, "error", { timeout: 0 })

const inspectRepository = async (): Promise<RepositorySyncState> => {
  const statusResult = await status(false)
  if (statusResult.exitCode !== 0) {
    return unknownState(gitError(statusResult, "Unable to read Git status."))
  }

  const dirty = statusResult.stdout.trim() !== ""

  const branchResult = await execGitCommand(["branch", "--show-current"])
  const branchName = branchResult.stdout.trim() || "current branch"

  const upstreamResult = await execGitCommand([
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{u}",
  ])

  if (upstreamResult.exitCode !== 0) {
    return unknownState(
      `The current branch (${branchName}) has no valid upstream. Publish it once with: git push -u origin ${branchName}`,
      dirty
    )
  }

  const fetchResult = await fetchRemote(false)
  if (fetchResult.exitCode !== 0) {
    return unknownState(gitError(fetchResult, "Unable to fetch the remote repository."), dirty)
  }

  const countResult = await execGitCommand([
    "rev-list",
    "--left-right",
    "--count",
    "HEAD...@{u}",
  ])

  if (countResult.exitCode !== 0) {
    return unknownState(
      gitError(
        countResult,
        "Unable to compare local and remote branches. Check that the current branch has an upstream."
      ),
      dirty
    )
  }

  const counts = countResult.stdout.trim().split(/\s+/).map(Number)
  if (counts.length < 2 || counts.some(Number.isNaN)) {
    return unknownState(`Unexpected git rev-list output: ${countResult.stdout}`, dirty)
  }

  const [ahead, behind] = counts

  let relation: SyncRelation = "synced"
  if (ahead > 0 && behind > 0) relation = "diverged"
  else if (ahead > 0) relation = "ahead"
  else if (behind > 0) relation = "behind"

  return { dirty, ahead, behind, relation }
}

const safeSyncInternal = async (showSuccess: boolean): Promise<SyncResult> => {
  const state = await inspectRepository()

  if (state.relation === "unknown") {
    const error = state.error || "Unable to determine repository state."
    showError(`Git sync failed: ${error}`)
    return { action: "error", state, error }
  }

  if (state.relation === "diverged") {
    showWarning(
      `Git sync stopped: local and remote histories have diverged (${state.ahead} local / ${state.behind} remote commit(s)). Resolve this manually before continuing.`
    )
    return { action: "skipped", state }
  }

  if (state.relation === "behind") {
    if (state.dirty) {
      showWarning(
        `Git sync postponed: the remote repository has ${state.behind} new commit(s), but the current graph has uncommitted local changes.`
      )
      return { action: "skipped", state }
    }

    const pullResult = await pullFastForward(false)
    if (pullResult.exitCode !== 0) {
      const error = gitError(pullResult, "Fast-forward pull failed.")
      showError(`Git sync failed while pulling: ${error}`)
      return { action: "error", state, error }
    }

    if (showSuccess) logseq.UI.showMsg("Git sync: remote changes downloaded.", "success")
    return { action: "pulled", state }
  }

  if (state.relation === "ahead") {
    const pushResult = await push(false)
    if (pushResult.exitCode !== 0) {
      const error = gitError(pushResult, "Push failed.")
      showError(`Git sync failed while pushing: ${error}`)
      return { action: "error", state, error }
    }

    if (showSuccess) logseq.UI.showMsg("Git sync: local commits uploaded.", "success")
    return { action: "pushed", state }
  }

  if (showSuccess) {
    logseq.UI.showMsg(
      state.dirty
        ? "Git sync: remote is up to date; local uncommitted changes remain."
        : "Git sync: repository is up to date.",
      "success"
    )
  }

  return { action: "none", state }
}

const runExclusive = async (operation: () => Promise<SyncResult>): Promise<SyncResult> => {
  if (workflowInProgress) return workflowInProgress

  workflowInProgress = operation()
  try {
    return await workflowInProgress
  } finally {
    workflowInProgress = undefined
  }
}

export const getRepositorySyncState = async (): Promise<RepositorySyncState> =>
  inspectRepository()

export const safeSync = async (showSuccess = false): Promise<SyncResult> =>
  runExclusive(() => safeSyncInternal(showSuccess))

export const commitAndSync = async (showSuccess = false): Promise<SyncResult> =>
  runExclusive(async () => {
    const statusResult = await status(false)
    if (statusResult.exitCode !== 0) {
      const error = gitError(statusResult, "Unable to read Git status.")
      const state = unknownState(error)
      showError(`Git sync failed: ${error}`)
      return { action: "error", state, error }
    }

    if (statusResult.stdout.trim() !== "") {
      const commitResult = await commit(false, commitMessage())
      if (commitResult.exitCode !== 0) {
        const error = gitError(commitResult, "Commit failed.")
        const state = unknownState(error, true)
        showError(`Git sync failed while committing: ${error}`)
        return { action: "error", state, error }
      }
    }

    return safeSyncInternal(showSuccess)
  })
