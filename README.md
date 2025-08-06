
# Team Generator Bot (Discord.js + TypeScript)

A Discord bot that splits players into random teams.  
Development environment is preconfigured with a **Devcontainer** (Node.js + TypeScript).


## 🚀 Requirements

- [Docker](https://www.docker.com/get-started) installed and running  
- [Visual Studio Code](https://code.visualstudio.com/) with the **Dev Containers** extension  
- A Discord developer account + a created bot application in the [Discord Developer Portal](https://discord.com/developers/applications)  
- A test server (guild) in Discord


## 🛠️ Setup

1. **Clone the repository**

    ```bash
    git clone https://github.com/chappy2/team-generator-bot
    cd team-generator-bot
    ````

2. **Set environment variables**
   Create or edit:

   ```
   .devcontainer/.env
   ```

   and add the following values:

   ```env
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_application_id
   GUILD_ID=your_guild_id
   ```

   **Explanation:**

   * **DISCORD\_TOKEN** → Bot token from the *Bot* tab in the Developer Portal
   * **CLIENT\_ID** → Application ID from the *General Information* tab
   * **GUILD\_ID** → Server ID of your test server (Right-click server name → *Copy Server ID*, Developer Mode must be enabled)

3. **Open the devcontainer**

   * In VS Code: `Ctrl+Shift+P` → **Dev Containers: Reopen in Container**
   * The container uses:

     ```
     mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm
     ```

     and automatically loads `.env` variables from `.devcontainer/.env`.

4. **Install dependencies**

   ```bash
   yarn install
   ```


## 💻 Development

* **Deploy Slash Commands (immediately available in your test server)**

  ```bash
  yarn deploy:cmds
  ```

* **Start the bot (development mode)**

  ```bash
  yarn dev
  ```

* **Build and start the bot (production mode)**

  ```bash
  yarn build
  yarn start
  ```


## 🧪 Testing

Tests are located in `src/**/*.test.ts` and use [Vitest](https://vitest.dev/).

```bash
yarn test
```



## ⚠️ Notes

* **Never commit your token** — `.devcontainer/.env` is listed in `.gitignore`
* Whenever you change slash commands, run `yarn deploy:cmds`
* Globally deployed commands can take up to 1 hour to appear
* The devcontainer comes with Node.js, Yarn, and TypeScript preinstalled


