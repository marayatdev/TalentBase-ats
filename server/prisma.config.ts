import "dotenv/config";

import {
    defineConfig,
    env,
} from "prisma/config";

export default defineConfig({
    schema:
        "prisma/schema.prisma",

    migrations: {
        path:
            "prisma/migrations",
    },

    datasource: {
        /*
         * Prisma CLI / migrate ใช้ Session Pooler
         * หรือ Direct connection
         *
         * Railway แนะนำให้ใช้ DIRECT_URL
         * แยกจาก runtime DATABASE_URL
         */
        url:
            env("DIRECT_URL"),
    },
});