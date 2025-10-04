import { createClient } from "redis"

const rc = createClient({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379" })
rc.connect().then(() => console.log("Redis connected")).catch(e => console.log("Error connecting redis", e))

export default rc
