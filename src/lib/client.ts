import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  REST,
  RESTPutAPIApplicationCommandsResult,
  Routes
} from 'discord.js';
import { readdirSync } from 'fs';
import path from 'path';
import { SlashCommand } from '../types';

export class ApplicationClient extends Client {
  private slashCommands = new Collection<string, SlashCommand>();
  //   private commands = new Collection<string, Command>();
  private cooldowns = new Collection<string, number>();
  private admins: string[];

  constructor(admins: string[] = []) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
      ]
    });
    this.admins = admins;
    super.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const command = this.slashCommands.get(interaction.commandName);
        if (!command) {
          return;
        }
        await interaction.deferReply();
        try {
          const res = await command.execute(interaction);
          if (res) {
            await interaction.editReply(res);
          }
        } catch (err) {
          if (err instanceof Error) {
            console.log(err);
            await interaction.editReply({ content: 'An error occurred while executing this command' });
            await interaction.reply({ ephemeral: true, content: err.message });
          }
        }
      } else if (interaction.isAutocomplete()) {
        const command = this.slashCommands.get(interaction.commandName);
        if (!command || !command.autocomplete) {
          return;
        }
        command.autocomplete(interaction);
      }
    });

    super.once(Events.ClientReady, async (c) => {
      await this.resolveModules();
      await this.migrate();
      console.log(`Ready! Logged in as ${c.user.tag}`);
    });
  }

  private async resolveModules() {
    const commandsDir = path.join(__dirname, '../commands');
    await Promise.all(
      readdirSync(commandsDir).map(async (file) => {
        const command: SlashCommand = (await import(`${commandsDir}/${file}`)).default;
        if (command.command) {
          const name = command.command.name;
          this.slashCommands.set(name, command);
          console.log(`Command ${name} registered ✅`);
          return name;
        } else {
          throw new Error('Invalid file');
        }
      })
    );
  }

  public async migrate() {
    const commands = [...this.slashCommands.values()];
    const clientId = process.env.DISCORD_APP_ID!;
    const guildId = process.env.DEVELOPMENT_GUILD_ID!;
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);
    let res;
    if (process.env.NODE_ENV != 'development') {
      res = (await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands.map((cmd) => cmd.command.toJSON())
      })) as RESTPutAPIApplicationCommandsResult;
    } else {
      res = (await rest.put(Routes.applicationCommands(clientId), {
        body: commands.map((cmd) => cmd.command.toJSON())
      })) as RESTPutAPIApplicationCommandsResult;
      // if (!this.admins.length) {
      //   return;
      // }
      // const { data } = await axios.post(
      //   'https://discord.com/api/oauth2/token',
      //   new URLSearchParams({
      //     grant_type: 'client_credentials',
      //     scope: 'applications.commands.permissions.update',
      //     client_id: process.env.DISCORD_APP_ID!,
      //     client_secret: process.env.DISCORD_CLIENT_SECRET!
      //   }),
      //   {
      //     headers: {
      //       'Content-Type': 'application/x-www-form-urlencoded'
      //     }
      //   }
      // );
      // console.log(res[0].name);
      // const token = data.access_token;
      // await Promise.all(
      //   res.map(async (cmd) => {
      //     await guild.commands.permissions.set({
      //       command: cmd.id,
      //       permissions: this.admins.map((id) => ({
      //         id,
      //         type: 2,
      //         permission: true
      //       })),
      //       token
      //     });
      //     console.log(`${cmd.name} has been set as an admin command`);
      //   })
      // );
    }

    console.log(`Migrated ${res.length} commands`);
  }
}
