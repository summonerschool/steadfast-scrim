import { REST } from '@discordjs/rest';
import { Client, Collection, Events, GatewayIntentBits, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import path from 'path';
import { SlashCommand } from '../types';

export class ApplicationClient extends Client {
  private slashCommands = new Collection<string, SlashCommand>();
  //   private commands = new Collection<string, Command>();
  private cooldowns = new Collection<string, number>();

  constructor() {
    super({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages]
    });
    super.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const command = this.slashCommands.get(interaction.commandName);
        if (!command) {
          return;
        }
        try {
          const res = await command.execute(interaction);
          if (res) {
            await interaction.reply({ ...res, fetchReply: true });
          }
        } catch (err) {
          if (err instanceof Error) {
            await interaction.reply({ content: err.message, fetchReply: true, ephemeral: true });
          }
        }
      }
    });

    super.once(Events.ClientReady, (c) => {
      console.log(`Ready! Logged in as ${c.user.tag}`);
    });
  }
  private async resolveModules() {
    const commandsDir = path.join(__dirname, '../commands2');
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
    await this.resolveModules();
    const commands = [...this.slashCommands.values()];
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!!);

    await rest.put(Routes.applicationCommands(process.env.DISCORD_APP_ID!!), {
      body: commands.map((cmd) => cmd.command.toJSON())
    });
    console.log(`Migrated ${commands.length} commands`);
  }
}
