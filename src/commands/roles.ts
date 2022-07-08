import { SlashCommandBuilder } from '@discordjs/builders';
const ROLES = [
  { name: 'Top', value: 'TOP' },
  { name: 'Jungle', value: 'JUNGLE' },
  { name: 'Mid', value: 'MID' },
  { name: 'Adc', value: 'ADC' },
  { name: 'Support', value: 'SUPPORT' }
];

const roleCmd = new SlashCommandBuilder()
  .setName('roles')
  .setDescription('Boast about your role')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('add')
      .setDescription('Add a new role')
      .addStringOption((option) =>
        option
          .setName('role')
          .setDescription('League of legends role')
          .addChoices(...ROLES)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) => subcommand.setName('info').setDescription('Show my roles'));

export default roleCmd;
