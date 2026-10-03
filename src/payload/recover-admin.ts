import dotenv from 'dotenv'
import path from 'path'
import payload from 'payload'
import { createInterface } from 'readline'

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
})

const promptForHiddenInput = (message: string): Promise<string> => {
  const stdin = process.stdin

  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal.')
  }

  return new Promise((resolve, reject) => {
    let value = ''
    const finish = (error?: Error): void => {
      stdin.removeListener('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
      process.stdout.write('\n')

      if (error) reject(error)
      else resolve(value)
    }

    const onData = (input: Buffer | string): void => {
      const key = input.toString()

      if (key === '\u0003') {
        finish(new Error('Admin recovery cancelled.'))
      } else if (key === '\r' || key === '\n') {
        finish()
      } else if (key === '\u007f' || key === '\b') {
        value = value.slice(0, -1)
      } else {
        value += key
      }
    }

    process.stdout.write(message)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.on('data', onData)
  })
}

const recoverAdmin = async (): Promise<void> => {
  if (!process.env.PAYLOAD_SECRET) {
    throw new Error('PAYLOAD_SECRET is missing. Check the project .env file.')
  }

  const serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL
  if (!serverURL) {
    throw new Error('PAYLOAD_PUBLIC_SERVER_URL is missing. Check the project .env file.')
  }

  const serverOrigin = new URL(serverURL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(serverOrigin.hostname) ||
    !['http:', 'https:'].includes(serverOrigin.protocol)
  ) {
    throw new Error('Admin recovery only verifies credentials against a local server URL.')
  }

  const input = createInterface({ input: process.stdin, output: process.stdout })
  const email = await new Promise<string>(resolve => {
    input.question('Account email: ', answer => resolve(answer.trim().toLowerCase()))
  })
  input.close()

  if (!email) {
    throw new Error('An account email is required.')
  }

  const password = await promptForHiddenInput('New password (input hidden): ')
  const passwordConfirm = await promptForHiddenInput('Confirm new password (input hidden): ')

  if (!password) {
    throw new Error('The password cannot be empty. No account was changed.')
  }

  if (password !== passwordConfirm) {
    throw new Error('The passwords do not match. No account was changed.')
  }

  await payload.init({
    local: true,
    secret: process.env.PAYLOAD_SECRET,
  })

  try {
    const matches = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email,
        },
      },
      limit: 2,
      overrideAccess: true,
    })

    if (matches.docs.length === 0) {
      throw new Error('No user exists with that email in the configured database.')
    }

    if (matches.docs.length > 1) {
      throw new Error('More than one user matches that email; no account was changed.')
    }

    const account = matches.docs[0]
    const roles = Array.isArray(account.roles)
      ? account.roles.filter(
          (role): role is 'admin' | 'customer' => role === 'admin' || role === 'customer',
        )
      : []
    const adminRoles: Array<'admin' | 'customer'> = roles.includes('admin')
      ? roles
      : [...roles, 'admin']

    await payload.update({
      collection: 'users',
      id: account.id,
      data: {
        password,
        roles: adminRoles,
      },
      overrideAccess: true,
    })

    await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })

    const response = await fetch(`${serverOrigin.origin}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error(
        `Password was updated and direct Payload login succeeded, but the running site's login API rejected it (HTTP ${response.status}). Restart the local app and rerun recovery.`,
      )
    }

    payload.logger.info(
      'Password updated; both Payload and the running site accepted the credentials.',
    )
  } finally {
    await payload.db.destroy?.(payload)
  }
}

recoverAdmin().catch(error => {
  console.error(
    'Admin recovery failed:',
    error instanceof Error ? error.message : 'An unexpected error occurred.',
  )
  process.exitCode = 1
})
