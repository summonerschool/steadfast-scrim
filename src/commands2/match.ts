import { SlashCommandBuilder } from 'discord.js';
import { formatErrors, retrieveOptions } from '../helpers/retrieveOptions';
import { MatchSchema } from '../schemas/user';
import { discordService, scrimService } from '../services';
import { SlashCommand } from '../types';
import { capitalize } from '../utils/utils';

const match: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('match')
    .addIntegerOption((opt) =>
      opt.setName('match_id').setDescription('The id of the game played').setRequired(true).setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('status')
        .setDescription('The result of the match')
        .setRequired(true)
        .setChoices({ name: 'win', value: 'WIN' }, { name: 'loss', value: 'LOSS' }, { name: 'remake', value: 'REMAKE' })
    )
    .setDescription('Reports the status of a match'),
  execute: async (interaction) => {
    const options = retrieveOptions(interaction.options.data, MatchSchema);
    const { match_id, status } = options;
    const guildId = interaction.guildId;
    if (!guildId) {
      return { content: 'Could not retrieve the discord server id' };
    }
    const scrim = await scrimService.findScrim(match_id);
    const player = scrim.players.find((p) => p.userID === interaction.user.id);
    if (!player) {
      return { content: `You did not play in match #${match_id}❌`, ephemeral: true };
    }
    const alreadyReported = scrim.status === 'COMPLETED';
    if (alreadyReported) {
      return { content: `Match has already been reported`, ephemeral: true };
    }
    if (status === 'REMAKE') {
      const res = await scrimService.remakeScrim(scrim);
      await discordService.deleteVoiceChannels(guildId, scrim.voiceIDs);
      return {
        content: res
          ? `Match #${match_id} has been reported as a remake`
          : 'Could not remake match. Please contact a moderator'
      };
    }
    const success = await scrimService.reportWinner(scrim, status);
    if (!success) {
      return { content: 'Oops! Could not set winner of match' };
    }
    await discordService.deleteVoiceChannels(guildId, scrim.voiceIDs);
    return { content: `${capitalize(status)} has been registered as the winner ✅` };
  },
  autocomplete: async (interaction) => {
    const availableScrims = await scrimService.getIncompleteScrims(interaction.user.id);
    const choices = availableScrims.map((scrim) => ({ name: `#${scrim.id}`, value: scrim.id }));
    await interaction.respond(choices);
  }
};

export default match;
