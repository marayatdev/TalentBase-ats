import App from "./app";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT) || 8000;

async function bootstrap(): Promise<void> {
    const app = new App();

    await app.listen(port);
}

bootstrap().catch((error) => {
    console.error(
        "❌ Failed to start application:",
        error,
    );

    process.exit(1);
});