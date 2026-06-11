import {createEffect, createSignal, onCleanup} from 'solid-js'
import type {Accessor} from 'solid-js'
import type {PgLiteDb} from '$shared/database/PgLiteDb'

export function createLiveQuery<T>(
    db: PgLiteDb,
    getOptions: () => { sql: string; params: unknown[]; fetch: () => Promise<T> }
): Accessor<T | undefined> {
    const [result, setResult] = createSignal<T | undefined>(undefined)

    createEffect(() => {
        const {sql, params, fetch} = getOptions()
        let unsubscribeFn: (() => Promise<void>) | null = null
        let cancelled = false

        const doFetch = () => {
            fetch().then(data => {
                if (!cancelled) {
                    setResult(() => data)
                }
            })
        }

        db.liveQuery(sql, params, () => {
            if (!cancelled) {
                doFetch()
            }
        }).then(({unsubscribe}) => {
            if (!cancelled) {
                doFetch()
                unsubscribeFn = () => unsubscribe()
            } else {
                unsubscribe()
            }
        })

        onCleanup(() => {
            cancelled = true
            unsubscribeFn?.()
        })
    })

    return result
}
