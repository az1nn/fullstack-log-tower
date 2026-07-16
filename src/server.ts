import { createLogTower, startLogTower } from './index'

const app = createLogTower()

const PORT = Number(process.env.PORT) || 3333

void (async () => {
  await app.ready()
  await startLogTower(app, PORT)
})()
