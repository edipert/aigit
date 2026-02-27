import { defineConfig } from '@prisma/config'

export default defineConfig({
    earlyAccess: true,
    url: 'postgresql://user:password@localhost:5432/database'
})
