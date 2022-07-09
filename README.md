## Development

### Prerequisite

- yarn
- NodeJS

I recommend using [Volta](https://volta.sh/) if you want to download Node locally. However, GitHub codespaces gives you a cloud environment with node and yarn installed. Therefore, you can also click the green code button and open it with codespaces (eventually conenct with VSCode).

### Commands

When first cloning the repository, run `yarn` to install all dependencies. 

Then you should use `prisma generate` to generate the required types from the database.

`yarn sync:dev` is a command that can be used to sync the current commands to a discord bot in a server. This will allow you to rapidly add and test the user-flow of new slash commands.

`yarn dev` will start a local Fastify server for local development. You should use `ngrok` to proxy `localhost:8200` and set it's url in the Discord developer portal.
