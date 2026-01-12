"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
let appPromise = null;
if (process.env.VERCEL) {
    appPromise = (async () => {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        app.enableCors({
            origin: [
                'http://localhost:4200',
                'https://va-ecru.vercel.app',
            ],
            credentials: true,
        });
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        return app;
    })();
}
exports.default = appPromise;
if (!process.env.VERCEL) {
    async function bootstrap() {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        app.enableCors({
            origin: [
                'http://localhost:4200',
                'https://va-ecru.vercel.app',
            ],
            credentials: true,
        });
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        await app.listen(process.env.PORT ?? 3000);
    }
    void bootstrap();
}
//# sourceMappingURL=main.js.map