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
  .setDescription('Queue up for a high quality game of lego legends');

  export default queueCmd