import { SlashCommandBuilder } from 'discord.js';
import { discordService, scrimService } from '..';
import { retrieveOptions } from '../helpers/retrieveOptions';
import { MatchCommandInputSchema } from '../schemas/user';
import { SlashCommand } from '../types';
import { capitalize } from '../utils/utils';

const match: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('match')
    .addIntegerOption((opt) =>
      opt.setName('id').setDescription('The id of the game played').setRequired(true).setAutocomplete(true)
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
    const options = retrieveOptions(interaction.options.data, MatchCommandInputSchema);
    const { id, status } = options;
    const guildId = interaction.guildId;
    if (!guildId) {
      return { content: 'Could not retrieve the discord server id' };
    }
    const scrim = await scrimService.findScrim(id);
    const inMatchId = await scrimService.playerIsInMatch(interaction.user.id);
    if (scrim.id != inMatchId) {
      return { content: `You did not play in match #${id}❌`, ephemeral: true };
    }
    const alreadyReported = scrim.status === 'COMPLETED';
    if (alreadyReported) {
      return { content: `Match has already been reported`, ephemeral: true };
    }
    if (status === 'REMAKE') {
      const res = await scrimService.remakeScrim(scrim);
      await discordService.deleteVoiceChannels(guildId, scrim.voiceIds);
      return {
        content: res
          ? `Match #${id} has been reported as a remake`
          : 'Could not remake match. Please contact a moderator'
      };
    }
    const player = await scrimService.getPlayer(interaction.user.id, id);
    if (!player) {
      throw new Error("Could not get the player's side");
    }
    const winner = status === 'WIN' ? player.side : player.side === 'BLUE' ? 'RED' : 'BLUE';
    const success = await scrimService.reportWinner(scrim, winner);
    if (!success) {
      return { content: 'Oops! Could not set winner of match' };
    }
    await discordService.deleteVoiceChannels(guildId, scrim.voiceIds);
    return { content: `${capitalize(status)} has been registered as the winner ✅` };
  },
  autocomplete: async (interaction) => {
    const availableScrims = await scrimService.getIncompleteScrims(interaction.user.id);
    const choices = availableScrims.map((scrim) => ({ name: `#${scrim.id}`, value: scrim.id }));
    await interaction.respond(choices);
  }
};

export default match;
