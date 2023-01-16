import type { MessageCreateOptions, VoiceChannel } from 'discord.js';
import type Discord from 'discord.js';
import { ChannelType } from 'discord.js';
import { env } from '../env';
import type { GameSide } from '../models/matchmaking';

export interface DiscordService {
  sendMatchDirectMessage: (userIDs: string[], message: MessageCreateOptions) => Promise<number>;
  createVoiceChannels: (guildID: string, teamNames: [string, string]) => Promise<[VoiceChannel, VoiceChannel]>;
  deleteVoiceChannels: (guildID: string, ids: string[]) => Promise<[string, string] | null>;
  sendMessageInChannel: (message: MessageCreateOptions) => void;
  createPostDiscussionThread: (matchId: number, winner: GameSide, teamNames: [string, string]) => Promise<string>;
}

export const initDiscordService = (discordClient: Discord.Client) => {
  const voiceCategoryID = env.DISCORD_VOICE_CATEGORY_ID;
  const commandChannelID = env.DISCORD_COMMAND_CHANNEL_ID;
  const feedbackChannelID = env.DISCORD_DISCUSSION_CHANNEL_ID;

  const service: DiscordService = {
    createVoiceChannels: async (guildID, teamNames) => {
      const guild = await discordClient.guilds.fetch({ guild: guildID });

      const channels = await Promise.all([
        guild.channels.create({
          type: ChannelType.GuildVoice,
          name: teamNames[0],
          userLimit: 5,
          parent: voiceCategoryID
        }),
        guild.channels.create({
          type: ChannelType.GuildVoice,
          name: teamNames[1],
          userLimit: 5,
          parent: voiceCategoryID
        })
      ]);
      return [channels[0], channels[1]];
    },
    sendMatchDirectMessage: async (userIDs: string[], message) => {
      const users = await Promise.all(userIDs.map((id) => discordClient.users.fetch(id)));
      const sent = await Promise.allSettled(users.map((u) => u.send(message)));
      return sent.filter((p) => p.status === 'fulfilled').length;
    },
    deleteVoiceChannels: async (guildID, ids) => {
      const guild = await discordClient.guilds.fetch({ guild: guildID });
      const channels = await Promise.all(ids.map((id) => guild.channels.fetch(id)));

      const teamVCs = channels.filter((vc): vc is VoiceChannel => vc != null && vc.parent?.id === voiceCategoryID);
      const deleted = await Promise.all(teamVCs.map((vc) => vc.delete()));

      return [deleted[0].name, deleted[1].name];
    },
    sendMessageInChannel: async (message) => {
      let channel = discordClient.channels.cache.get(commandChannelID);
      if (!channel) {
        const res = await discordClient.channels.fetch(commandChannelID);
        if (res) channel = res;
        else {
          throw new Error('Could not send message');
        }
      }
      const commandChannel = channel as Discord.TextChannel;
      await commandChannel.send(message);
    },
    createPostDiscussionThread: async (matchId, winner, teamNames) => {
      let channel = discordClient.channels.cache.get(feedbackChannelID);
      if (!channel) {
        const res = await discordClient.channels.fetch(feedbackChannelID);
        if (res) channel = res;
        else {
          throw new Error('Could not send message');
        }
      }
      const forum = channel as Discord.ForumChannel;
      const [blue, red] = teamNames;
      const res = await forum.threads.create({
        name: `Match #${matchId}: ${blue} vs ${red}`,
        autoArchiveDuration: 1440,
        reason: `Feedback channel for match #${matchId}`,
        message: { content: `${winner === 'BLUE' ? blue : red} won the game.\nRemember to keep it civilized.` }
      });
      return res.id;
    }
  };
  return service;
};
