import React, { Fragment, useCallback, useState } from 'react'

export const SeedButton: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      if (loading || seeded) return

      setLoading(true)

      try {
        const response = await fetch('/api/seed')
        const result: { success?: boolean; error?: string } = await response.json()

        if (!response.ok || result.success !== true) {
          throw new Error(result.error || `Seeding failed with status ${response.status}.`)
        }

        setSeeded(true)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred while seeding.')
      } finally {
        setLoading(false)
      }
    },
    [loading, seeded],
  )

  let message = ''
  if (loading) message = ' (seeding...)'
  if (seeded) message = ' (done!)'
  if (error) message = ` (error: ${error})`

  return (
    <Fragment>
      <a href="/api/seed" target="_blank" rel="noopener noreferrer" onClick={handleClick}>
        Seed your database
      </a>
      {message}
    </Fragment>
  )
}
