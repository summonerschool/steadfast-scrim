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
import { env } from '../env';
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
        try {
          const res = await command.execute(interaction);
          if (res) {
            if (interaction.replied) {
              await interaction.editReply(res);
            } else {
              await interaction.reply(res);
            }
          }
        } catch (err) {
          if (err instanceof Error) {
            console.log(err);
            if (!interaction.replied) {
              await interaction.reply({ content: err.message, ephemeral: true });
            } else {
              await interaction.editReply({ content: err.message });
            }
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
      if (process.env.NODE_ENV === 'production') {
        await this.migrate();
      }

      console.log(`Ready! Logged in as ${c.user.tag}`);
    });
  }

  private async resolveModules() {
    const dir = path.join(__dirname, '../commands');
    await Promise.all(
      readdirSync(dir).map(async (file) => {
        const command: SlashCommand = (await import(`${dir}/${file}`)).default;
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
    const commands = [...this.slashCommands.values()].filter((cmd) => cmd.command.name != 'admin');
    const clientId = env.DISCORD_APP_ID;
    const guildId = env.DISCORD_DEVELOPMENT_GUILD_ID;
    await this.application?.commands.set([]);
    await this.guilds.cache.get(guildId!)?.commands.set([]);
    const rest = new REST({ version: '10' }).setToken(env.DISCORD_BOT_TOKEN);

    let res;
    if (guildId) {
      res = (await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands.map((cmd) => cmd.command.toJSON())
      })) as RESTPutAPIApplicationCommandsResult;
      console.log(res);
    } else {
      res = (await rest.put(Routes.applicationCommands(clientId), {
        body: commands.map((cmd) => cmd.command.toJSON())
      })) as RESTPutAPIApplicationCommandsResult;
    }
    console.log(`Migrated ${res.length} commands`);
  }
}
