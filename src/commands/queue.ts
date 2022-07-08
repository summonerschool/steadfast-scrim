import { SlashCommandBuilder } from '@discordjs/builders';

const ROLES = [
	{ name: "Top", value: "TOP" },
	{ name: "Jungle", value: "JUNGLE" },
	{ name: "Mid", value: "MID" },
	{ name: "Adc", value: "ADC" },
	{ name: "Support", value: "SUPPORT" }
]

const queueCmd = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Queue')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('join')
      .setDescription('join a queue')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('leave')
      .setDescription('Leave a queue')
  )

  export default queueCmd