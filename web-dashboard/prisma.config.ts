
import { defineConfig } from '@prisma/config'

export default defineConfig({
    migrations: {
        seed: 'node prisma/seed.js',
    },
    datasource: {
        provider: 'sqlite',
        url: 'file:./dev.db',
    },
})
