import { SlashCommandBuilder } from 'discord.js';
import { discordService, redis, scrimService } from '..';
import { env } from '../env';
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
    await interaction.deferReply();
    const scrim = await scrimService.findScrim(id);
    const player = await scrimService.getPlayer(interaction.user.id, id);
    if (!player) {
      return { content: `You did not play in match #${id}❌`, ephemeral: true };
    }
    const alreadyReported = scrim.status === 'COMPLETED';
    if (alreadyReported) {
      return { content: `Match has already been reported`, ephemeral: true };
    }
    // Delete voice channels
    const voiceIDs = await redis.spop(`${scrim.guildID}:scrim#${scrim.id}:voiceChannels`, 2);

    if (status === 'REMAKE') {
      const res = await scrimService.remakeScrim(scrim);
      await discordService.deleteVoiceChannels(guildId, voiceIDs);
      return {
        content: res
          ? `Match #${id} has been reported as a remake`
          : 'Could not remake match. Please contact a moderator'
      };
    }
    const winner = status === 'WIN' ? player.side : player.side === 'BLUE' ? 'RED' : 'BLUE';
    const success = await scrimService.reportWinner(scrim, winner);
    if (!success) {
      return { content: 'Oops! Could not set winner of match' };
    }
    const teamNames = await discordService.deleteVoiceChannels(guildId, voiceIDs);
    console.log('Attempting to delete:', voiceIDs.join(','));
    let postmatchDiscussionID: string | null = null;
    if (teamNames) {
      postmatchDiscussionID = await discordService.createPostDiscussionThread(id, winner, teamNames);
    }
    return {
      content: `${capitalize(winner)} has been registered as the winner ✅.\n${
        postmatchDiscussionID
          ? `Discussion thread: https://discord.com/channels/${env.DISCORD_DEVELOPMENT_GUILD_ID}/${postmatchDiscussionID}`
          : ''
      }`
    };
  },
  autocomplete: async (interaction) => {
    const availableScrims = await scrimService.getIncompleteScrims(interaction.user.id);
    const choices = availableScrims.map((scrim) => ({ name: `#${scrim.id}`, value: scrim.id }));
    await interaction.respond(choices);
  }
};

export default match;
