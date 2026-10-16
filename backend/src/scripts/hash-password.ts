/**
 * Genera los valores de APP_PASSWORD_HASH y SESSION_SECRET.
 *
 *   npm run hash-password
 *
 * Pide la contraseña sin mostrarla en pantalla. Copia los dos valores a las
 * variables de entorno de Vercel (y a backend/.env si quieres probar en local).
 */
import { randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'
import readline from 'readline'

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

function preguntarOculto(pregunta: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    const salida = rl as unknown as { _writeToOutput: (texto: string) => void; output: NodeJS.WritableStream }
    let ocultar = false
    salida._writeToOutput = (texto: string) => {
      salida.output.write(ocultar ? '' : texto)
    }
    rl.question(pregunta, (respuesta) => {
      rl.close()
      process.stdout.write('\n')
      resolve(respuesta)
    })
    ocultar = true
  })
}

async function main() {
  const password = await preguntarOculto('Contraseña de acceso (mínimo 10 caracteres): ')
  if (password.length < 10) {
    console.error('La contraseña debe tener al menos 10 caracteres.')
    process.exit(1)
  }
  const confirmacion = await preguntarOculto('Repite la contraseña: ')
  if (password !== confirmacion) {
    console.error('Las contraseñas no coinciden.')
    process.exit(1)
  }

  const sal = randomBytes(16)
  const hash = await scryptAsync(password, sal, 64)

  console.log('\nCopia estas dos variables de entorno (no las subas a git):\n')
  console.log(`APP_PASSWORD_HASH=scrypt:${sal.toString('hex')}:${hash.toString('hex')}`)
  console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}`)
}

main()
