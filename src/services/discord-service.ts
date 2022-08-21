import Discord, { ChannelType, VoiceChannel } from 'discord.js';
import { discordService } from '.';

export interface DiscordService {
  sendMatchDirectMessage: (userIDs: string[], message: Discord.MessageOptions) => Promise<number>;
  createVoiceChannels: (guildID: string, teamNames: [string, string]) => Promise<[VoiceChannel, VoiceChannel]>;
  deleteVoiceChannels: (guildID: string, ids: string[]) => Promise<boolean>;
}

export const activeVoiceIDs = new Map<string, string[]>();

process.on('exit', async () => {
  const promises: Promise<boolean>[] = [];
  for (const [guildID, voiceIDs] of activeVoiceIDs) {
    promises.push(discordService.deleteVoiceChannels(guildID, voiceIDs));
  }
  await Promise.all(promises);
});

export const initDiscordService = (discordClient: Discord.Client) => {
  const voiceCategoryID = process.env.VOICE_CATEGORY_ID || '';

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
      const curr = activeVoiceIDs.get(guildID) || [];
      activeVoiceIDs.set(guildID, [...curr, channels[0].id, channels[1].id]);
      return [channels[0], channels[1]];
    },
    sendMatchDirectMessage: async (userIDs: string[], message) => {
      const users = await Promise.all(userIDs.map((id) => discordClient.users.fetch(id)));
      const sent = await Promise.allSettled(users.map((u) => u.send(message)));
      return sent.filter((p) => p.status === 'fulfilled').length;
    },
    deleteVoiceChannels: async (guildID, ids) => {
      const guild = await discordClient.guilds.fetch({ guild: guildID });
      const current = activeVoiceIDs.get(guildID) || [];
      console.log({ currentVoiceIDs: current });
      if (!current.some((id) => ids.includes(id))) {
        return false;
      }
      const channels = await Promise.all(ids.map((id) => guild.channels.fetch(id)));

      const teamVCs = channels.filter((vc): vc is VoiceChannel => vc != null && vc.parent?.id === voiceCategoryID);
      // Delete voice channels and remove them from active voice ids list
      const deleted = await Promise.all(teamVCs.map((vc) => vc.delete()));
      activeVoiceIDs.set(
        guildID,
        current.filter((id) => deleted.some((vc) => vc.id !== id))
      );

      return true;
    }
  };
  return service;
};
