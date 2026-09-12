/** The About section: app version, project directory, and the in-app updater. */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AppUpdateInfo, AppUpdateOperations } from './about-operations.ts'
import css from './AboutSection.module.css'

/** Registrant-owned dependencies of {@link AboutSection}. */
export interface AboutSectionInjected {
  /** Host updater operations this section drives. */
  update: AppUpdateOperations
}

/** Section owner share, localized copy, and the registrant's operations face. */
export type AboutSectionComponentProps =
  PropsRuntime<'settings.section'> & PropsLocale<'settings'> & InjectFace<AboutSectionInjected>

type CheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'result'; updateAvailable: boolean; latestVersion: string | null }
  | { status: 'applying' }
  | { status: 'applied'; appliedVersion: string }
  | { status: 'not-a-checkout' }
  | { status: 'error'; message: string }

/**
 * Render the About section: the running version and project directory, a button
 * that runs the read-only update check, and — when a newer release exists — a
 * button that applies it in place. Applying rewrites the working tree, so the
 * app must be restarted afterwards.
 * @param props - section owner share, localized copy, and the updater face.
 * @returns the section element tree.
 */
export function AboutSection({ update, t }: AboutSectionComponentProps): ReactNode {
  const [info, setInfo] = useState<AppUpdateInfo>({ version: 'unknown', appRoot: null })
  const [state, setState] = useState<CheckState>({ status: 'idle' })

  useEffect(() => {
    let live = true
    void update.info().then((next) => {
      if (live) setInfo(next)
    })
    return () => { live = false }
  }, [update])

  const check = async (): Promise<void> => {
    setState({ status: 'checking' })
    const outcome = await update.check()
    switch (outcome.kind) {
      case 'checked':
        setState({ status: 'result', updateAvailable: outcome.updateAvailable, latestVersion: outcome.latestVersion })
        return
      case 'not-a-checkout':
        setState({ status: 'not-a-checkout' })
        return
      case 'refused':
        setState({ status: 'error', message: outcome.message })
        return
      default:
        setState({ status: 'error', message: t('about.checkFailed') })
    }
  }

  const apply = async (): Promise<void> => {
    setState({ status: 'applying' })
    const outcome = await update.apply()
    setState(outcome.kind === 'applied'
      ? { status: 'applied', appliedVersion: outcome.appliedVersion }
      : { status: 'error', message: outcome.message })
  }

  const busy = state.status === 'checking' || state.status === 'applying'

  return (
    <div className={css.section}>
      <div className={css.row}>
        <span className={css.label}>{t('about.version')}</span>
        <span className={css.value}>{info.version}</span>
      </div>
      <div className={css.row}>
        <span className={css.label}>{t('about.repo')}</span>
        <span className={css.value}>{info.appRoot ?? '–'}</span>
      </div>
      <div className={css.actions}>
        <Button variant="outline" size="md" disabled={busy} onClick={() => { void check() }}>
          {state.status === 'checking' ? t('about.checking') : t('about.check')}
        </Button>
      </div>
      {state.status === 'error' ? <p className={css.error} role="alert">{state.message}</p> : null}
      {state.status === 'not-a-checkout' ? <p role="status">{t('about.notGit')}</p> : null}
      {state.status === 'result' ? (
        <div className={css.result}>
          {state.latestVersion === null ? (
            <p role="status">{t('about.noTags')}</p>
          ) : state.updateAvailable ? (
            <>
              <p className={css.update} role="status">
                {t('about.updateAvailable', { latest: state.latestVersion })}
              </p>
              <Button variant="primary" size="md" onClick={() => { void apply() }}>
                {t('about.update')}
              </Button>
            </>
          ) : (
            <p role="status">{t('about.upToDate', { latest: state.latestVersion })}</p>
          )}
        </div>
      ) : null}
      {state.status === 'applying' ? <p className={css.update} role="status">{t('about.updating')}</p> : null}
      {state.status === 'applied' ? (
        <p className={css.update} role="status">{t('about.applied', { version: state.appliedVersion })}</p>
      ) : null}
    </div>
  )
}
