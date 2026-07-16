import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    # Disable hot reload in production to prevent startup hangs and port scanning timeouts
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
