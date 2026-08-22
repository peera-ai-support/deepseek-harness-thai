/** The About section: app version, project directory, and a read-only update check. */

import { useState, useSyncExternalStore } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import css from './AboutSection.module.css'

/** Registrant-owned dependencies of {@link AboutSection}. */
export interface AboutSectionInjected {
  /** The connected host handle: version snapshot and the host RPC face. */
  connection: ConnectionHandle
}

/** Section owner share, localized copy, and the registrant's state face. */
export type AboutSectionComponentProps =
  PropsRuntime<'settings.section'> & PropsLocale<'settings'> & InjectFace<AboutSectionInjected>

type CheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'result'; updateAvailable: boolean; latestVersion: string | null }
  | { status: 'error'; message: string }

/**
 * Render the About section: version and project directory from the host
 * snapshot, plus a button that runs a read-only update check (git fetch;
 * never pulls) and reports the outcome.
 * @param props - section owner share, localized copy, and the connection face.
 * @returns the section element tree.
 */
export function AboutSection({ connection, t }: AboutSectionComponentProps) {
  const host = useSyncExternalStore(
    listener => connection.hostDescription.subscribe(listener),
    () => connection.hostDescription.getSnapshot(),
  )
  const [state, setState] = useState<CheckState>({ status: 'idle' })

  const check = async () => {
    setState({ status: 'checking' })
    try {
      const response = await connection.api.host.updateCheck({})
      if (!response.result.ok) {
        setState({
          status: 'error',
          message: response.result.error.code === 'not-a-git-checkout'
            ? t('about.notGit')
            : response.result.error.message,
        })
        return
      }
      setState({
        status: 'result',
        updateAvailable: response.result.value.updateAvailable,
        latestVersion: response.result.value.latestVersion,
      })
    } catch {
      setState({ status: 'error', message: t('about.checkFailed') })
    }
  }

  return (
    <div className={css.section}>
      <div className={css.row}>
        <span className={css.label}>{t('about.version')}</span>
        <span className={css.value}>{host?.version ?? '–'}</span>
      </div>
      <div className={css.row}>
        <span className={css.label}>{t('about.repo')}</span>
        <span className={css.value}>{host?.cwd ?? '–'}</span>
      </div>
      <div className={css.actions}>
        <Button
          variant="outline"
          size="md"
          disabled={state.status === 'checking'}
          onClick={() => void check()}
        >
          {state.status === 'checking' ? t('about.checking') : t('about.check')}
        </Button>
      </div>
      {state.status === 'error' ? (
        <p className={css.error} role="alert">{state.message}</p>
      ) : null}
      {state.status === 'result' ? (
        <div className={css.result}>
          {state.latestVersion === null ? (
            <p role="status">{t('about.noTags')}</p>
          ) : state.updateAvailable ? (
            <>
              <p className={css.update} role="status">{t('about.updateAvailable', { latest: state.latestVersion })}</p>
              <p className={css.hint}>{t('about.updateHint')}</p>
              <code className={css.command}>git pull</code>
            </>
          ) : (
            <p role="status">{t('about.upToDate', { latest: state.latestVersion })}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
